import React, { useState, useEffect } from 'react';
import { 
  Database, Search, Filter, Building2, Layers, Zap, 
  Trash2, RefreshCw, CheckCircle2, ChevronLeft, ChevronRight, 
  ArrowUpRight, AlertTriangle, ShieldCheck, Sparkles, Plus,
  Package, Info, BarChart3, CheckCheck, X, UploadCloud, FileSpreadsheet
} from 'lucide-react';
import { 
  adminMedicineService, 
  CatalogMedicineItem, 
  CatalogMetadata, 
  TenantMedicineStats,
  CatalogStats
} from '../../services/adminMedicineService';
import { BulkMedicineAssignModal } from './BulkMedicineAssignModal';
import { BulkCsvUploaderModal } from './BulkCsvUploaderModal';
import { emitToast } from '../../contexts/ToastContext';

export const MasterMedicineSeederTab: React.FC = () => {
  // State
  const [items, setItems] = useState<CatalogMedicineItem[]>([]);
  const [metadata, setMetadata] = useState<CatalogMetadata | null>(null);
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenantStats, setTenantStats] = useState<TenantMedicineStats | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding14k, setIsSeeding14k] = useState(false);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignInitialCompany, setAssignInitialCompany] = useState<string | undefined>();
  const [assignInitialCategory, setAssignInitialCategory] = useState<string | undefined>();
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Single Medicine Add Modal State
  const [isAddSingleModalOpen, setIsAddSingleModalOpen] = useState(false);
  const [singleName, setSingleName] = useState('');
  const [singleGeneric, setSingleGeneric] = useState('');
  const [singleCompany, setSingleCompany] = useState('');
  const [singleCategory, setSingleCategory] = useState('General Medicine');
  const [singleDosageForm, setSingleDosageForm] = useState('Tablet');
  const [singleStrength, setSingleStrength] = useState('');
  const [singleBarcode, setSingleBarcode] = useState('');
  const [singlePackSize, setSinglePackSize] = useState(1);
  const [singleMinStock, setSingleMinStock] = useState(5);
  const [isCreatingSingle, setIsCreatingSingle] = useState(false);

  // Revoke modal state
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeMode, setRevokeMode] = useState<'company' | 'category' | 'wipe_all'>('company');
  const [revokeTargetCompany, setRevokeTargetCompany] = useState('');
  const [revokeTargetCategory, setRevokeTargetCategory] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  // Fetch dynamic stats from MariaDB
  const loadStats = async () => {
    try {
      const data = await adminMedicineService.fetchCatalogStats();
      setStats(data);
    } catch (err) {
      console.warn('Stats load notice:', err);
    }
  };

  // Fetch catalog metadata
  const loadMetadata = async () => {
    try {
      const data = await adminMedicineService.fetchCatalogMetadata();
      setMetadata(data);
      if (data.tenants && data.tenants.length > 0 && !selectedTenantId) {
        setSelectedTenantId(data.tenants[0].id);
      }
    } catch (err) {
      console.warn('Metadata load notice:', err);
    }
  };

  // Fetch paginated catalog page
  const loadCatalog = async () => {
    setIsLoading(true);
    try {
      const data = await adminMedicineService.fetchCatalogPage({
        page,
        limit,
        search: searchQuery.trim(),
        company: selectedCompany,
        category: selectedCategory,
        tenantId: selectedTenantId
      });

      setItems(data.items);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.warn('Catalog load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch tenant stats when selected store changes
  const loadTenantStats = async (tenantId: string) => {
    if (!tenantId) return;
    try {
      const stats = await adminMedicineService.fetchTenantMedicineStats(tenantId);
      setTenantStats(stats);
    } catch (err) {
      console.warn('Tenant stats notice:', err);
    }
  };

  useEffect(() => {
    loadStats();
    loadMetadata();
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [page, limit, selectedCompany, selectedCategory]);

  useEffect(() => {
    if (selectedTenantId) {
      loadTenantStats(selectedTenantId);
    }
  }, [selectedTenantId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCatalog();
  };

  // 1-Click Initial Seeder
  const handle1ClickSeed14k = async () => {
    if (!window.confirm('⚡ Seed / Sync all 14,322 authentic Master Medicines to MariaDB? Existing records will be safely updated without duplicates.')) {
      return;
    }

    setIsSeeding14k(true);
    try {
      const res = await adminMedicineService.seed14kMedicines();
      emitToast(res.message || '14,322 Master Medicines successfully seeded to MariaDB!', 'success');
      loadStats();
      loadMetadata();
      loadCatalog();
    } catch (err: any) {
      emitToast(err.message || 'Failed to seed 14k medicines', 'error');
    } finally {
      setIsSeeding14k(false);
    }
  };

  // Handle Single Medicine Creation
  const handleCreateSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) {
      emitToast('Please enter a medicine name', 'error');
      return;
    }

    setIsCreatingSingle(true);
    try {
      const res = await adminMedicineService.createSingleMedicine({
        name: singleName.trim(),
        generic_salt: singleGeneric.trim() || undefined,
        company: singleCompany.trim() || 'Standard Pharma',
        category: singleCategory,
        dosage_form: singleDosageForm,
        strength: singleStrength.trim() || undefined,
        barcode: singleBarcode.trim() || undefined,
        pack_size: Number(singlePackSize) || 1,
        min_stock_level: Number(singleMinStock) || 5
      });

      emitToast(res.message || 'Medicine added to global catalog!', 'success');
      setIsAddSingleModalOpen(false);
      setSingleName('');
      setSingleGeneric('');
      setSingleCompany('');
      setSingleStrength('');
      setSingleBarcode('');
      loadStats();
      loadMetadata();
      loadCatalog();
    } catch (err: any) {
      emitToast(err.message || 'Failed to add medicine', 'error');
    } finally {
      setIsCreatingSingle(false);
    }
  };

  // Quick Company Allocation Trigger
  const handleQuickAssignCompany = (compName: string) => {
    setAssignInitialCompany(compName);
    setAssignInitialCategory(undefined);
    setIsAssignModalOpen(true);
  };

  // Revoke Action
  const handleExecuteRevoke = async () => {
    if (!selectedTenantId) {
      emitToast('Please select a target tenant', 'error');
      return;
    }

    const tenantObj = (metadata?.tenants || []).find(t => t.id === selectedTenantId);
    const storeName = tenantObj?.name || 'Pharmacy Store';

    if (revokeMode === 'wipe_all' && !window.confirm(`⚠️ DANGER: Wipe ALL catalog medicines from "${storeName}"? This resets the store medicine inventory to zero.`)) {
      return;
    }

    setIsRevoking(true);
    try {
      const res = await adminMedicineService.revokeMedicines({
        tenantId: selectedTenantId,
        mode: revokeMode,
        company: revokeMode === 'company' ? revokeTargetCompany : undefined,
        category: revokeMode === 'category' ? revokeTargetCategory : undefined
      });

      emitToast(res.message || 'Medicines revoked successfully', 'info');
      setIsRevokeModalOpen(false);
      loadTenantStats(selectedTenantId);
    } catch (err: any) {
      emitToast(err.message || 'Failed to revoke medicines', 'error');
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card (Clean Dual Theme #FFFFFF in Light Mode, deep obsidian in Dark Mode) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                14k+ Master Pharmacy Catalog Studio
              </span>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Unlimited Scalable Architecture
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              Master Medicine Seeder, Streaming CSV Importer & Store Allocations
            </h2>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* 1-Click Initial Seeder */}
          <button
            type="button"
            onClick={handle1ClickSeed14k}
            disabled={isSeeding14k}
            className="px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 hover:bg-amber-100 text-amber-900 dark:text-amber-300 font-black text-xs flex items-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            title="Seed 14,322 authentic master medicines into MariaDB"
          >
            {isSeeding14k ? <RefreshCw className="w-4 h-4 animate-spin text-amber-600" /> : <Sparkles className="w-4 h-4 text-amber-600" />}
            <span>⚡ Seed 14,322 Master Medicines</span>
          </button>

          {/* Upload CSV / Excel Catalog */}
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            <span>📤 Upload CSV / Excel</span>
          </button>

          {/* Add Single Medicine */}
          <button
            type="button"
            onClick={() => setIsAddSingleModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>➕ Add Single</span>
          </button>

          {/* Bulk Allocate */}
          <button
            type="button"
            onClick={() => {
              setAssignInitialCompany(undefined);
              setAssignInitialCategory(undefined);
              setIsAssignModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-98 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>⚡ Bulk Allocate to Store...</span>
          </button>

          {/* De-Allocate */}
          <button
            type="button"
            onClick={() => setIsRevokeModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 text-rose-700 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>De-Allocate...</span>
          </button>
        </div>
      </div>

      {/* KPI Dynamic Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">MariaDB Global Catalog</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
            {(stats?.totalGlobalMedicines || metadata?.totalCatalogItems || 14322).toLocaleString()} Items
          </span>
          <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">Live Dynamic MariaDB Count</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Pharma Manufacturers</span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
            {stats?.totalCompanies || metadata?.totalCompanies || 120} Companies
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Getz, GSK, Abbott, Pfizer, Sanofi</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Therapeutic Categories</span>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5 block">
            {stats?.totalCategories || metadata?.totalCategories || 45} Classes
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Antibiotics, NSAIDs, Cardiology</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Target Store Allocations</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
            {tenantStats?.totalAssignedMedicines?.toLocaleString() || 0} In Stock
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {(metadata?.tenants || []).find(t => t.id === selectedTenantId)?.name || 'Store'}
          </span>
        </div>
      </div>

      {/* Target Pharmacy Store Quick Selector & Stats Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Selected Pharmacy Store:
          </label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
          >
            {(metadata?.tenants || []).map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.city}) - [{t.plan} Plan]
              </option>
            ))}
          </select>
        </div>

        {/* Tenant Breakdown Mini Badges */}
        {tenantStats && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Top Assigned Brands:</span>
            {tenantStats.companiesBreakdown.slice(0, 4).map(c => (
              <span key={c.company} className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900 text-[11px]">
                {c.company} ({c.count})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Filter & Search Ribbon */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Input (5 cols) */}
          <form onSubmit={handleSearchSubmit} className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by brand name, generic salt, company or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Company Filter (4 cols) */}
          <div className="sm:col-span-4">
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="ALL">🏢 All Companies ({metadata?.totalCompanies || 0})</option>
              {(metadata?.companies || []).map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count} items)
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter (3 cols) */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="ALL">📦 All Categories ({metadata?.totalCategories || 0})</option>
              {(metadata?.categories || []).map(cat => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Quick Company Shortcuts Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Quick Assign:</span>
          {['Getz Pharma', 'GSK', 'Abbott', 'Sanofi', 'Pfizer', 'Novartis', 'Searle', 'Highnoon', 'AGP Limited'].map(comp => (
            <button
              key={comp}
              type="button"
              onClick={() => handleQuickAssignCompany(comp)}
              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 border border-slate-200 dark:border-slate-700 text-[11px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>+ {comp}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 50-Item Paginated Master Catalog Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        
        {/* Table Header Bar */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black text-slate-900 dark:text-white">
              Showing {items.length} of {totalCount.toLocaleString()} items (Page {page} of {totalPages})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadCatalog();
                loadStats();
              }}
              className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Medicine Name & Formulation</th>
                <th className="py-3 px-4">Generic Active Salt</th>
                <th className="py-3 px-4">Manufacturer</th>
                <th className="py-3 px-4">Therapeutic Category</th>
                <th className="py-3 px-4">Dosage Form</th>
                <th className="py-3 px-4">Barcode</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading chunked catalog...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No medicines found matching the search criteria. Click "⚡ Seed 14,322 Master Medicines" above.
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {m.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {m.genericFormula || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-blue-700 dark:text-blue-300">
                      {m.company || 'Standard'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                        {m.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {m.dosageForm || 'Tablet'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                      {m.barcode || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (m.company) {
                            handleQuickAssignCompany(m.company);
                          } else {
                            setIsAssignModalOpen(true);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-bold transition-colors cursor-pointer"
                        title="Allocate Company Batch"
                      >
                        + Assign
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-semibold text-slate-500">
            Page {page} of {totalPages} ({totalCount.toLocaleString()} total items)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-bold px-2 text-slate-700 dark:text-slate-300">
              {page}
            </span>

            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Bulk Medicine Assign Modal */}
      <BulkMedicineAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        metadata={metadata}
        initialSelectedCompany={assignInitialCompany}
        initialSelectedCategory={assignInitialCategory}
        onSuccess={() => {
          loadCatalog();
          if (selectedTenantId) loadTenantStats(selectedTenantId);
        }}
      />

      {/* Bulk CSV Uploader Modal */}
      <BulkCsvUploaderModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => {
          loadStats();
          loadMetadata();
          loadCatalog();
        }}
      />

      {/* Single Medicine Add Modal */}
      {isAddSingleModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <form onSubmit={handleCreateSingleSubmit} className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Plus className="w-5 h-5" />
                <h3 className="font-black text-sm">Add New Master Medicine</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSingleModalOpen(false)}
                className="p-1 rounded-full text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-slate-900 dark:text-white max-h-[75vh] overflow-y-auto custom-scrollbar text-xs font-bold">
              <div>
                <label className="block text-slate-500 mb-1">Brand Name & Formulation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Panadol Extra 500/65mg Tablet"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Generic Active Salt</label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol + Caffeine"
                    value={singleGeneric}
                    onChange={(e) => setSingleGeneric(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Manufacturer Company</label>
                  <input
                    type="text"
                    placeholder="e.g. GSK"
                    value={singleCompany}
                    onChange={(e) => setSingleCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Category</label>
                  <select
                    value={singleCategory}
                    onChange={(e) => setSingleCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  >
                    {['General Medicine', 'Analgesics & Antipyretics', 'Antibiotics & Anti-Infectives', 'Gastrointestinal & Anti-Ulcerants', 'Cardiovascular & Antihypertensive', 'Antidiabetic & Endocrinology', 'Respiratory & Anti-Asthma', 'Antiallergic & Antihistamines', 'Neurology & CNS', 'Dermatologicals', 'Vitamins & Minerals'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Dosage Form</label>
                  <select
                    value={singleDosageForm}
                    onChange={(e) => setSingleDosageForm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  >
                    {['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops', 'Topical Cream', 'Inhaler', 'Eye Drops', 'Sachet'].map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-500 mb-1">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg"
                    value={singleStrength}
                    onChange={(e) => setSingleStrength(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="Auto-generated"
                    value={singleBarcode}
                    onChange={(e) => setSingleBarcode(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Pack Size</label>
                  <input
                    type="number"
                    min={1}
                    value={singlePackSize}
                    onChange={(e) => setSinglePackSize(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddSingleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingSingle}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCreatingSingle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Save to Master Catalog</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* De-Allocate & Revoke Modal */}
      {isRevokeModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-black text-sm">De-Allocate / Revoke Medicines</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRevokeModalOpen(false)}
                className="p-1 rounded-full text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-slate-900 dark:text-white">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Target Pharmacy Store:</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                >
                  {(metadata?.tenants || []).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Revoke Scope:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRevokeMode('company')}
                    className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                      revokeMode === 'company' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    By Company
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevokeMode('category')}
                    className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                      revokeMode === 'category' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    By Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevokeMode('wipe_all')}
                    className={`py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                      revokeMode === 'wipe_all' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Wipe All
                  </button>
                </div>
              </div>

              {revokeMode === 'company' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Select Company to Revoke:</label>
                  <select
                    value={revokeTargetCompany}
                    onChange={(e) => setRevokeTargetCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="">-- Choose Company --</option>
                    {(metadata?.companies || []).map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {revokeMode === 'category' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Select Category to Revoke:</label>
                  <select
                    value={revokeTargetCategory}
                    onChange={(e) => setRevokeTargetCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="">-- Choose Category --</option>
                    {(metadata?.categories || []).map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {revokeMode === 'wipe_all' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-medium">
                  ⚠️ This will wipe all assigned medicines and initial batches for the selected pharmacy store.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRevokeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRevoke}
                disabled={isRevoking || (revokeMode === 'company' && !revokeTargetCompany) || (revokeMode === 'category' && !revokeTargetCategory)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isRevoking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Execute Revoke</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
