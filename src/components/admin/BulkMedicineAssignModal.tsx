import React, { useState, useEffect } from 'react';
import { 
  X, Building2, Package, CheckCircle2, AlertTriangle, 
  Sparkles, Search, Layers, RefreshCw, ArrowRight, ShieldCheck,
  CheckCheck, Check, Database, Zap
} from 'lucide-react';
import { adminMedicineService, CatalogMetadata } from '../../services/adminMedicineService';
import { emitToast } from '../../contexts/ToastContext';

interface BulkMedicineAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: CatalogMetadata | null;
  onSuccess?: () => void;
  initialSelectedCompany?: string;
  initialSelectedCategory?: string;
}

export const BulkMedicineAssignModal: React.FC<BulkMedicineAssignModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onSuccess,
  initialSelectedCompany,
  initialSelectedCategory
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [mode, setMode] = useState<'company' | 'category' | 'all'>('company');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [companySearch, setCompanySearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  
  const [isAllocating, setIsAllocating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [allocatedResult, setAllocatedResult] = useState<{ count: number; storeName: string } | null>(null);

  useEffect(() => {
    if (metadata && metadata.tenants && metadata.tenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(metadata.tenants[0].id);
    }
    if (initialSelectedCompany) {
      setMode('company');
      setSelectedCompany(initialSelectedCompany);
    } else if (initialSelectedCategory) {
      setMode('category');
      setSelectedCategory(initialSelectedCategory);
    } else if (metadata && metadata.companies && metadata.companies.length > 0 && !selectedCompany) {
      setSelectedCompany(metadata.companies[0].name);
    }
    if (metadata && metadata.categories && metadata.categories.length > 0 && !selectedCategory) {
      setSelectedCategory(metadata.categories[0].name);
    }
  }, [metadata, initialSelectedCompany, initialSelectedCategory]);

  if (!isOpen) return null;

  const filteredCompanies = (metadata?.companies || []).filter(c => 
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredCategories = (metadata?.categories || []).filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const targetTenant = (metadata?.tenants || []).find(t => t.id === selectedTenantId);

  const handleStartAllocation = async () => {
    if (!selectedTenantId) {
      emitToast('Please select a target pharmacy store', 'error');
      return;
    }

    setIsAllocating(true);
    setProgressPercent(15);
    setAllocatedResult(null);

    const progressTimer = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 85) return prev;
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);

    try {
      const res = await adminMedicineService.assignMedicinesBatch({
        targetTenantId: selectedTenantId,
        targetTenantName: targetTenant?.name || 'Pharmacy Store',
        mode,
        company: mode === 'company' ? selectedCompany : undefined,
        category: mode === 'category' ? selectedCategory : undefined
      });

      clearInterval(progressTimer);
      setProgressPercent(100);

      setTimeout(() => {
        setIsAllocating(false);
        setAllocatedResult({
          count: res.assignedCount,
          storeName: targetTenant?.name || 'Pharmacy Store'
        });
        emitToast(res.message || 'Medicines allocated successfully with deduplication!', 'success');
        if (onSuccess) onSuccess();
      }, 400);

    } catch (err: any) {
      clearInterval(progressTimer);
      setIsAllocating(false);
      setProgressPercent(0);
      emitToast(err.message || 'Failed to allocate medicines', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black leading-snug">
                Chunked Medicine Allocation Studio
              </h3>
              <p className="text-xs text-blue-100">
                Allocate master catalog medicines by company or category with zero-crash deduplication
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-slate-900 dark:text-white">
          
          {/* Success Screen State */}
          {allocatedResult ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-in zoom-in-50 duration-300">
                <CheckCheck className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  Allocation Successfully Completed!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Allocated <span className="font-bold text-emerald-600">{allocatedResult.count} items</span> to{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{allocatedResult.storeName}</span>. 
                  Automatic deduplication ensured zero duplicate stock records.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setAllocatedResult(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Allocate Another Batch
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Select Target Pharmacy Store */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Step 1: Select Target Pharmacy Store
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  disabled={isAllocating}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  {(metadata?.tenants || []).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city}) - [{t.plan} Plan]
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Assignment Mode */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Step 2: Choose Allocation Mode
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMode('company')}
                    disabled={isAllocating}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      mode === 'company'
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>By Company / Mfr</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('category')}
                    disabled={isAllocating}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      mode === 'category'
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>By Category</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('all')}
                    disabled={isAllocating}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      mode === 'all'
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Full Master (14k+)</span>
                  </button>
                </div>
              </div>

              {/* Mode Sub-Selector */}
              {mode === 'company' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Select Manufacturer Company:
                    </label>
                    <div className="relative w-44">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search company..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {filteredCompanies.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedCompany(c.name)}
                        disabled={isAllocating}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                          selectedCompany === c.name
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                          selectedCompany === c.name ? 'bg-white/20 text-white font-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {c.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'category' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Select Therapeutic Category:
                    </label>
                    <div className="relative w-44">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search category..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {filteredCategories.map(cat => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setSelectedCategory(cat.name)}
                        disabled={isAllocating}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          selectedCategory === cat.name
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                          selectedCategory === cat.name ? 'bg-white/20 text-white font-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {cat.count} items
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'all' && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Assign Full Master Pharmacy Catalog (14,320+ items)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Runs in a non-blocking chunked background stream. Deduplication guard prevents creating duplicate records for medicines already in the store.
                  </p>
                </div>
              )}

              {/* Progress Bar when Allocating */}
              {isAllocating && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Chunking & Deduplicating Allocations...
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-blue-100 dark:bg-blue-900/60 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        {!allocatedResult && (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero-Crash Deduplication Active</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isAllocating}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStartAllocation}
                disabled={isAllocating}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAllocating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>⚡ Allocate to Store</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
