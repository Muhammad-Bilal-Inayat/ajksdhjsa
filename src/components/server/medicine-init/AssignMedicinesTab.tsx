import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { CentralMedicine } from '../../../types';
import {
  Send,
  Building2,
  Layers,
  Search,
  CheckSquare,
  Square,
  CheckCircle2,
  PackageCheck,
  Sparkles,
  Sliders,
  Filter,
  RefreshCw,
  X,
  Check,
  Pill,
  Tag,
  ArrowRight,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { 
  assignMedicinesToCustomer, 
  assignCategoryToCustomer,
  syncAssignedMedicinesForTenant,
  unassignMedicinesFromCustomer,
  unassignCategoryFromCustomer
} from '../../../lib/centralMedicineDatabaseService';

interface AssignMedicinesTabProps {
  medicines: CentralMedicine[];
  categories: string[];
  tenants: any[];
  preselectedTenantId?: string;
  preselectedMedicineIds?: string[];
  onComplete: () => void;
  showToast?: (msg: string) => void;
  onOpenCsvUpload?: () => void;
}

export const AssignMedicinesTab: React.FC<AssignMedicinesTabProps> = ({
  medicines,
  categories,
  tenants,
  preselectedTenantId,
  preselectedMedicineIds,
  onComplete,
  showToast,
  onOpenCsvUpload
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [initialStock, setInitialStock] = useState<number>(20);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [assignProgress, setAssignProgress] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<string | null>(null);

  // Pagination states for ultra high speed rendering (Prevents browser freeze on 24,000+ items)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Quick Category summary counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    medicines.forEach(m => {
      const cat = m.category?.trim() || 'General';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [medicines]);

  useEffect(() => {
    if (preselectedTenantId) {
      setSelectedTenantId(preselectedTenantId);
    } else if (tenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(tenants[0].tenantId || tenants[0].id);
    }
  }, [preselectedTenantId, tenants, selectedTenantId]);

  useEffect(() => {
    if (preselectedMedicineIds && preselectedMedicineIds.length > 0) {
      setSelectedMedIds(preselectedMedicineIds);
    }
  }, [preselectedMedicineIds]);

  const selectedTenantObj = useMemo(() => {
    return tenants.find(t => (t.tenantId || t.id) === selectedTenantId);
  }, [tenants, selectedTenantId]);

  // Ultra-fast O(1) selection lookup Set
  const selectedMedIdsSet = useMemo(() => new Set(selectedMedIds), [selectedMedIds]);

  // Filtered medicines with fast matching
  const filteredMedicines = useMemo(() => {
    const q = search.toLowerCase().trim();
    return medicines.filter(m => {
      if (selectedCategory !== 'ALL' && m.category !== selectedCategory) return false;
      if (q) {
        const matchName = (m.name || '').toLowerCase().includes(q);
        const matchBrand = (m.brandName || '').toLowerCase().includes(q);
        const matchCompany = (m.company || '').toLowerCase().includes(q);
        const matchGeneric = (m.genericName || '').toLowerCase().includes(q);
        const matchCategory = (m.category || '').toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchCompany && !matchGeneric && !matchCategory) return false;
      }
      return true;
    });
  }, [medicines, selectedCategory, search]);

  // Reset page to 1 whenever category or search filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, search, pageSize]);

  // Paginated slice for current viewport
  const totalPages = Math.max(1, Math.ceil(filteredMedicines.length / pageSize));
  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMedicines.slice(start, start + pageSize);
  }, [filteredMedicines, currentPage, pageSize]);

  const toggleSelectAllFiltered = useCallback(() => {
    const filteredIds = filteredMedicines.map(m => m.id);
    const allInFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedMedIdsSet.has(id));

    if (allInFilteredSelected) {
      const filterIdSet = new Set(filteredIds);
      setSelectedMedIds(prev => prev.filter(id => !filterIdSet.has(id)));
    } else {
      setSelectedMedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  }, [filteredMedicines, selectedMedIdsSet]);

  const handleSelectEntireCategory = useCallback((catName: string) => {
    const catMeds = medicines.filter(m => (m.category || 'General') === catName).map(m => m.id);
    const allCatSelected = catMeds.length > 0 && catMeds.every(id => selectedMedIdsSet.has(id));

    if (allCatSelected) {
      const catSet = new Set(catMeds);
      setSelectedMedIds(prev => prev.filter(id => !catSet.has(id)));
    } else {
      setSelectedMedIds(prev => Array.from(new Set([...prev, ...catMeds])));
    }
  }, [medicines, selectedMedIdsSet]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedMedIds(prev =>
      selectedMedIdsSet.has(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, [selectedMedIdsSet]);

  const handleExecuteAssignment = async () => {
    if (!selectedTenantId) {
      alert('Please select a customer / tenant account.');
      return;
    }

    if (selectedMedIds.length === 0) {
      alert('Please select at least one medicine to assign.');
      return;
    }

    const tenantName = selectedTenantObj?.name || (selectedTenantObj as any)?.storeName || selectedTenantId;

    setIsAssigning(true);
    setAssignProgress(`Assigning & Syncing ${selectedMedIds.length} items to ${tenantName}...`);
    setSuccessResult(null);

    try {
      // 1. Assign in core service
      const res = await assignMedicinesToCustomer({
        tenantId: selectedTenantId,
        tenantName,
        medicineIds: selectedMedIds,
        initialStock,
        adminName: 'Master Admin'
      });

      // 2. Auto trigger immediate synchronization for tenant & all subusers
      await syncAssignedMedicinesForTenant(selectedTenantId);

      setIsAssigning(false);
      setAssignProgress(null);

      if (res.success) {
        setSuccessResult(`✅ Successfully assigned ${selectedMedIds.length} medicines to ${tenantName} and auto-synced to all subusers.`);
        if (showToast) showToast(res.message);
        onComplete();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      setIsAssigning(false);
      setAssignProgress(null);
      alert('Error during assignment: ' + (err?.message || 'Unknown error'));
    }
  };

  // Direct Assign Entire Category Button handler
  const handleAssignActiveCategoryDirectly = async () => {
    if (!selectedTenantId) {
      alert('Please select a customer account first.');
      return;
    }
    if (selectedCategory === 'ALL') {
      alert('Please choose a specific category to assign directly.');
      return;
    }

    const tenantName = selectedTenantObj?.name || selectedTenantId;
    const catCount = categoryCounts[selectedCategory] || 0;

    const confirmed = window.confirm(`Assign all ${catCount} items in category "${selectedCategory}" to "${tenantName}" with initial stock ${initialStock}?`);
    if (!confirmed) return;

    setIsAssigning(true);
    setAssignProgress(`Assigning category "${selectedCategory}" (${catCount} items)...`);
    try {
      const res = await assignCategoryToCustomer({
        tenantId: selectedTenantId,
        tenantName,
        category: selectedCategory,
        initialStock,
        adminName: 'Master Admin'
      });

      await syncAssignedMedicinesForTenant(selectedTenantId);
      setIsAssigning(false);
      setAssignProgress(null);

      if (res.success) {
        setSuccessResult(res.message);
        if (showToast) showToast(res.message);
        onComplete();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      setIsAssigning(false);
      setAssignProgress(null);
      alert('Error assigning category: ' + (err?.message || 'Unknown error'));
    }
  };

  // Direct Unassign Entire Category Button handler
  const handleUnassignActiveCategory = async () => {
    if (!selectedTenantId) {
      alert('Please select a customer account first.');
      return;
    }
    if (selectedCategory === 'ALL') {
      alert('Please choose a specific category to unassign.');
      return;
    }

    const tenantName = selectedTenantObj?.name || selectedTenantId;
    const confirmed = window.confirm(`⚠️ Remove/Unassign all items in category "${selectedCategory}" from "${tenantName}" and delete them from their inventory?`);
    if (!confirmed) return;

    setIsUnassigning(true);
    const res = await unassignCategoryFromCustomer({
      tenantId: selectedTenantId,
      category: selectedCategory,
      adminName: 'Master Admin'
    });
    setIsUnassigning(false);

    if (res.success) {
      setSuccessResult(res.message);
      if (showToast) showToast(res.message);
      onComplete();
    } else {
      alert(res.message);
    }
  };

  // Unassign Selected Medicines Button handler
  const handleExecuteUnassignSelected = async () => {
    if (!selectedTenantId) {
      alert('Please select a customer account first.');
      return;
    }
    if (selectedMedIds.length === 0) {
      alert('Please select at least one medicine to unassign.');
      return;
    }

    const tenantName = selectedTenantObj?.name || selectedTenantId;
    const confirmed = window.confirm(`Revoke and unassign ${selectedMedIds.length} selected medicines from "${tenantName}"?`);
    if (!confirmed) return;

    setIsUnassigning(true);
    const res = await unassignMedicinesFromCustomer({
      tenantId: selectedTenantId,
      medicineIds: selectedMedIds,
      deleteFromInventory: true,
      adminName: 'Master Admin'
    });
    setIsUnassigning(false);

    if (res.success) {
      setSuccessResult(res.message);
      if (showToast) showToast(res.message);
      setSelectedMedIds([]);
      onComplete();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Customer & Provisioning Settings */}
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
            <Building2 className="w-4 h-4" />
            <span>Target Customer Account</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select User / Pharmacy</label>
            <select
              value={selectedTenantId}
              onChange={e => setSelectedTenantId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
            >
              {tenants.map(t => {
                const id = t.tenantId || t.id;
                const name = t.name || (t as any).storeName || 'Pharmacy';
                return (
                  <option key={id} value={id}>
                    {name} ({id})
                  </option>
                );
              })}
            </select>
          </div>

          {selectedTenantObj && (
            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
              <div className="text-white font-bold flex items-center justify-between">
                <span>{selectedTenantObj.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {selectedTenantObj.plan || 'Standard'}
                </span>
              </div>
              <div className="text-slate-400 font-mono text-[11px]">Tenant ID: {selectedTenantId}</div>
              <div className="text-slate-500 text-[11px]">{selectedTenantObj.ownerPhone || selectedTenantObj.city || 'Active Terminal'}</div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Default Stock Allocation</span>
              <span className="text-[11px] font-mono text-sky-400 font-bold">{initialStock} Units</span>
            </label>
            <input
              type="number"
              min={0}
              max={10000}
              value={initialStock}
              onChange={e => setInitialStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Stock units automatically provisioned into the customer inventory with verified batch and barcode.
            </p>
          </div>

          {/* Quick Category Action Card if a specific category is chosen */}
          {selectedCategory !== 'ALL' && (
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
              <div className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Category Batch Action</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-300">
                  {categoryCounts[selectedCategory] || 0} items
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Manage all items in <strong>{selectedCategory}</strong> for selected pharmacy.
              </p>
              
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={isAssigning || !selectedTenantId}
                  onClick={handleAssignActiveCategoryDirectly}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Assign All "{selectedCategory}"</span>
                </button>

                <button
                  type="button"
                  disabled={isUnassigning || !selectedTenantId}
                  onClick={handleUnassignActiveCategory}
                  className="w-full py-1.5 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-medium text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="Remove all items of this category from selected customer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke / Unassign "{selectedCategory}"</span>
                </button>
              </div>
            </div>
          )}

          {/* Direct CSV Upload Button */}
          {onOpenCsvUpload && (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <div className="text-xs font-bold text-emerald-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Upload & Auto-Assign .CSV</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Upload custom list (medicines, surgicals, orthopedics) and auto-assign to selected pharmacy.
              </p>
              <button
                type="button"
                onClick={onOpenCsvUpload}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Upload .CSV File Now</span>
              </button>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button
              disabled={isAssigning || selectedMedIds.length === 0 || !selectedTenantId}
              onClick={handleExecuteAssignment}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md shadow-sky-900/30 transition-all cursor-pointer"
            >
              {isAssigning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Provisioning & Syncing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Assign {selectedMedIds.length} Selected Items</span>
                </>
              )}
            </button>

            {selectedMedIds.length > 0 && selectedTenantId && (
              <button
                disabled={isUnassigning}
                onClick={handleExecuteUnassignSelected}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isUnassigning ? 'Unassigning Items...' : `Unassign ${selectedMedIds.length} Selected Items`}
              </button>
            )}
          </div>

          {assignProgress && (
            <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs text-sky-300 flex items-center gap-2 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>{assignProgress}</span>
            </div>
          )}

          {successResult && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successResult}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Category Picker + Multi-Select Catalog */}
      <div className="lg:col-span-2 space-y-4">
        {/* Category Horizontal Filter Chips */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Filter by Category & Quick Select</span>
            </span>
            <span className="text-[11px] text-sky-400 font-mono font-bold">
              {selectedMedIds.length} Selected
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'ALL'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>All Items</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white font-mono">
                {medicines.length}
              </span>
            </button>

            {categories.map(cat => {
              const count = categoryCounts[cat] || 0;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by brand, generic formula, company..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedCategory !== 'ALL' && (
                <button
                  onClick={() => handleSelectEntireCategory(selectedCategory)}
                  className="px-3 py-2 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Toggle Category</span>
                </button>
              )}

              <button
                onClick={toggleSelectAllFiltered}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer"
              >
                Select All ({filteredMedicines.length})
              </button>

              {selectedMedIds.length > 0 && (
                <button
                  onClick={() => setSelectedMedIds([])}
                  className="px-2.5 py-2 text-rose-400 hover:bg-rose-950/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Clear all selections"
                >
                  Clear ({selectedMedIds.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Medicines Checkbox List (Ultra-High Speed Paginated / Windowed) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {/* List Header / Summary */}
          <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-mono font-bold">
                {filteredMedicines.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span> to <span className="text-white font-mono font-bold">
                {Math.min(currentPage * pageSize, filteredMedicines.length)}
              </span> of <span className="text-white font-mono font-bold">{filteredMedicines.length}</span> items
            </div>
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-800/60">
            {paginatedMedicines.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs space-y-2">
                <Pill className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No central catalog medicines found matching your filters.</p>
              </div>
            ) : (
              paginatedMedicines.map(med => {
                const isSelected = selectedMedIdsSet.has(med.id);
                const isAlreadyAssigned = selectedTenantId && med.assignedTenantIds?.includes(selectedTenantId);

                return (
                  <div
                    key={med.id}
                    onClick={() => toggleSelectOne(med.id)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                      isSelected ? 'bg-sky-950/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          toggleSelectOne(med.id);
                        }}
                        className="p-0.5 text-slate-400 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{med.name}</span>
                          {isAlreadyAssigned && (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Already Assigned
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="font-semibold text-slate-300">{med.brandName || med.company || 'Pharma'}</span>
                          <span>•</span>
                          <span className="text-sky-400 font-medium">{med.category || 'General'}</span>
                          {(med.genericFormula || med.genericName) && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-slate-500 text-[10.5px]">{med.genericFormula || med.genericName}</span>
                            </>
                          )}
                          {med.strength && (
                            <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                              {med.strength}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 shrink-0 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                        {med.unit || 'Strip'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls Footer */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="text-slate-400">
                Page <span className="font-bold text-white">{currentPage}</span> of <span className="font-bold text-white">{totalPages}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-[11px] font-bold px-2.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-[11px] font-bold px-2.5"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
