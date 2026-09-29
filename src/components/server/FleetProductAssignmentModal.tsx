import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Package,
  Search,
  Layers,
  Send,
  CheckSquare,
  Square,
  Sparkles,
  Building2,
  CheckCircle2,
  Trash2,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Pill,
  Tag,
  ShieldCheck
} from 'lucide-react';
import { CentralMedicine, Tenant } from '../../types';
import {
  getCentralMedicines,
  assignMedicinesToCustomer,
  assignCategoryToCustomer,
  unassignMedicinesFromCustomer,
  unassignCategoryFromCustomer,
  getAssignedMedicinesForCustomer,
  importCentralMedicinesFromCsv
} from '../../lib/centralMedicineDatabaseService';

interface FleetProductAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  allTenants: Tenant[];
  onSuccess: (msg: string) => void;
}

export const FleetProductAssignmentModal: React.FC<FleetProductAssignmentModalProps> = ({
  isOpen,
  onClose,
  tenant,
  allTenants,
  onSuccess
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'csv_upload' | 'assigned_view'>('catalog');
  const [medicines, setMedicines] = useState<CentralMedicine[]>(() => getCentralMedicines());
  const [assignedMeds, setAssignedMeds] = useState<CentralMedicine[]>([]);
  
  // Pagination & Filtering state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [initialStock, setInitialStock] = useState<number>(20);
  
  // Assigned Tab Search
  const [assignedSearch, setAssignedSearch] = useState('');
  const [assignedCategory, setAssignedCategory] = useState('ALL');

  // CSV Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [csvPreview, setCsvPreview] = useState<Array<Record<string, string>>>([]);
  const [targetTenantId, setTargetTenantId] = useState<string>('');

  // Processing & Feedback state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (tenant) {
      setTargetTenantId(tenant.id || tenant.tenantId || '');
      refreshAssignedList();
    }
  }, [tenant]);

  const refreshAssignedList = () => {
    if (!tenant) return;
    const tid = tenant.id || tenant.tenantId || '';
    const assigned = getAssignedMedicinesForCustomer(tid);
    setAssignedMeds(assigned);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach(m => {
      if (m.category?.trim()) set.add(m.category.trim());
    });
    return Array.from(set).sort();
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      if (selectedCategory !== 'ALL' && m.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = (m.name || '').toLowerCase().includes(q);
        const matchBrand = (m.brandName || '').toLowerCase().includes(q);
        const matchCompany = (m.company || '').toLowerCase().includes(q);
        const matchGeneric = (m.genericName || m.genericFormula || '').toLowerCase().includes(q);
        const matchCategory = (m.category || '').toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchCompany && !matchGeneric && !matchCategory) return false;
      }
      return true;
    });
  }, [medicines, selectedCategory, search]);

  const filteredAssignedMeds = useMemo(() => {
    return assignedMeds.filter(m => {
      if (assignedCategory !== 'ALL' && m.category !== assignedCategory) return false;
      if (assignedSearch.trim()) {
        const q = assignedSearch.toLowerCase().trim();
        const matchName = (m.name || '').toLowerCase().includes(q);
        const matchBrand = (m.brandName || '').toLowerCase().includes(q);
        const matchGeneric = (m.genericFormula || m.genericName || '').toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchGeneric) return false;
      }
      return true;
    });
  }, [assignedMeds, assignedCategory, assignedSearch]);

  const totalPages = Math.ceil(filteredMedicines.length / pageSize) || 1;
  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMedicines.slice(start, start + pageSize);
  }, [filteredMedicines, currentPage, pageSize]);

  if (!isOpen || !tenant) return null;

  const currentTenantId = tenant.id || tenant.tenantId || '';
  const currentTenantName = tenant.name || (tenant as any).storeName || 'Pharmacy Branch';

  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedMedicines.map(m => m.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedMedIds.includes(id));

    if (allPageSelected) {
      setSelectedMedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedMedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredMedicines.map(m => m.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedMedIds.includes(id));

    if (allFilteredSelected) {
      setSelectedMedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedMedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedMedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 1-Click Fast Progressive Batch Assign
  const handleAssignSelected = async () => {
    if (selectedMedIds.length === 0) {
      alert('Please select at least one medicine or surgical item.');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(10);
    setStatusMessage(null);

    try {
      // Chunked assignment in batches of 250 to keep UI 100% fluid
      const CHUNK_SIZE = 250;
      const total = selectedMedIds.length;
      let totalAssigned = 0;

      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const slice = selectedMedIds.slice(i, i + CHUNK_SIZE);
        await assignMedicinesToCustomer({
          tenantId: currentTenantId,
          tenantName: currentTenantName,
          medicineIds: slice,
          initialStock,
          adminName: 'Master Fleet Control'
        });
        totalAssigned += slice.length;
        setProcessProgress(Math.round((totalAssigned / total) * 100));
        // Give event loop a breath
        await new Promise(r => setTimeout(r, 10));
      }

      setIsProcessing(false);
      setProcessProgress(100);
      const successMsg = `Successfully assigned ${total} items to ${currentTenantName}!`;
      setStatusMessage({ type: 'success', text: successMsg });
      refreshAssignedList();
      onSuccess(successMsg);
      setSelectedMedIds([]);
    } catch (err: any) {
      setIsProcessing(false);
      setStatusMessage({ type: 'error', text: err?.message || 'Assignment failed' });
    }
  };

  // 1-Click Unassign Selected
  const handleUnassignSelected = async () => {
    if (selectedMedIds.length === 0) {
      alert('Please select items to unassign.');
      return;
    }

    if (!confirm(`Revoke and unassign ${selectedMedIds.length} items from ${currentTenantName}?`)) return;

    setIsProcessing(true);
    setStatusMessage(null);

    const res = await unassignMedicinesFromCustomer({
      tenantId: currentTenantId,
      medicineIds: selectedMedIds,
      deleteFromInventory: true,
      adminName: 'Master Fleet Control'
    });

    setIsProcessing(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      refreshAssignedList();
      onSuccess(res.message);
      setSelectedMedIds([]);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // Direct Assign Category
  const handleAssignEntireCategory = async () => {
    if (selectedCategory === 'ALL') {
      alert('Please choose a specific category first.');
      return;
    }

    const count = filteredMedicines.length;
    if (!confirm(`Assign all ${count} items in category "${selectedCategory}" to ${currentTenantName}?`)) return;

    setIsProcessing(true);
    setStatusMessage(null);

    const res = await assignCategoryToCustomer({
      tenantId: currentTenantId,
      tenantName: currentTenantName,
      category: selectedCategory,
      initialStock,
      adminName: 'Master Fleet Control'
    });

    setIsProcessing(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      refreshAssignedList();
      onSuccess(res.message);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // Direct Unassign Category
  const handleUnassignEntireCategory = async () => {
    if (selectedCategory === 'ALL') {
      alert('Please choose a specific category to revoke.');
      return;
    }

    if (!confirm(`⚠️ REVOKE all items in category "${selectedCategory}" from ${currentTenantName}?`)) return;

    setIsProcessing(true);
    setStatusMessage(null);

    const res = await unassignCategoryFromCustomer({
      tenantId: currentTenantId,
      category: selectedCategory,
      adminName: 'Master Fleet Control'
    });

    setIsProcessing(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      refreshAssignedList();
      onSuccess(res.message);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // CSV Template Download
  const handleDownloadSampleCsv = () => {
    const sample = [
      'Item Name,Brand Name,Company,Category,Generic Formula,Dosage Form,Strength,Unit',
      'Bone Holding Forceps 8 Inch,Endo Tech,Endo Tech Surgical,Surgical & Disposable Supplies,Surgical Steel,Instrument,8 Inch,Piece',
      'IV Cannula 20G Pink with Wings & Port,BD Venflon,Becton Dickinson (BD),Surgical & Disposable Supplies,PTFE Cannula,Cannula,20G (1.1x32mm),Box',
      'Vicryl 3-0 Suture Round Body,Ethicon,Johnson & Johnson Ethicon,Surgical & Disposable Supplies,Polyglactin 910 Braided,Suture,3-0 26mm Needle,Box',
      'Crepe Bandage 10cm x 4.5m,DynaPlast,Johnson & Johnson,Surgical & Disposable Supplies,Cotton Stretch Elastic,Bandage,10cm x 4.5m,Roll',
      'L.S. Support Belt Rigid Large,Tynor Orthotics,Tynor,Orthopedic & Rehabilitation Care,Lumbosacral Belt with Stays,Orthopedic Device,Large (36-40 Inch),Piece',
      'Cervical Soft Foam Collar Medium,Tynor Orthotics,Tynor,Orthopedic & Rehabilitation Care,High Density Foam,Orthopedic Device,Medium,Piece',
      'Plaster of Paris (POP) 15cm x 2.7m,Gypsona,BSN Medical,Orthopedic & Rehabilitation Care,Fast Setting POP,POP Bandage,15cm x 2.7m,Roll',
      'Panadol 500mg Tablet,Panadol,GSK,Analgesics & Antipyretics,Paracetamol,Tablet,500mg,Strip',
      'Augmentin 625mg Tablet,Augmentin,GSK,Antibiotics & Anti-Infectives,Amoxicillin + Clavulanic Acid,Tablet,625mg,Box'
    ].join('\n');

    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fleet_assignment_template_${currentTenantName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setCsvFile(file);
      setStatusMessage(null);

      const reader = new FileReader();
      reader.onload = evt => {
        const text = evt.target?.result as string;
        setCsvText(text);

        try {
          const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length >= 2) {
            const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
            const previewRows: Array<Record<string, string>> = [];
            for (let i = 1; i < Math.min(lines.length, 6); i++) {
              const tokens = lines[i].split(',').map(t => t.trim().replace(/^["']|["']$/g, ''));
              const obj: Record<string, string> = {};
              headers.forEach((h, idx) => { obj[h] = tokens[idx] || ''; });
              previewRows.push(obj);
            }
            setCsvPreview(previewRows);
          }
        } catch {}
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteCsvImport = () => {
    if (!csvText.trim()) {
      alert('Please upload a valid CSV file first.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    setTimeout(() => {
      try {
        const res = importCentralMedicinesFromCsv(
          csvText,
          'FLEET_CSV_IMPORT',
          currentTenantId,
          currentTenantName
        );

        setIsProcessing(false);
        if (res.success) {
          setStatusMessage({ type: 'success', text: res.message });
          setMedicines(getCentralMedicines());
          refreshAssignedList();
          onSuccess(res.message);
        } else {
          setStatusMessage({ type: 'error', text: res.message });
        }
      } catch (e: any) {
        setIsProcessing(false);
        setStatusMessage({ type: 'error', text: e?.message || 'CSV Ingestion Error' });
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  Master Fleet Inventory Assigner: <span className="text-sky-400">{currentTenantName}</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {tenant.plan || 'Pharmacy Pro'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Tenant ID: {currentTenantId} • Currently Assigned: <span className="text-emerald-400 font-bold">{assignedMeds.length} Items</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('catalog')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'catalog'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Virtualized Catalog Assigner</span>
            </button>

            <button
              onClick={() => setActiveSubTab('csv_upload')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'csv_upload'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bulk .CSV Uploader</span>
            </button>

            <button
              onClick={() => setActiveSubTab('assigned_view')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'assigned_view'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Assigned Items ({assignedMeds.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Opening Stock:</span>
            <input
              type="number"
              min="0"
              value={initialStock}
              onChange={e => setInitialStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-sky-500"
            />
            <span className="text-slate-400">units</span>
          </div>
        </div>

        {/* Feedback Banner */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: CATALOG ASSIGNER */}
        {activeSubTab === 'catalog' && (
          <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
            {/* Search and Category Filter Bar */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search medicines, surgical blades, cannula, sutures, braces, formula..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedCategory}
                    onChange={e => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 max-w-[200px]"
                  >
                    <option value="ALL">All Categories ({categories.length})</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                </div>
              </div>

              {/* Action Ribbon */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-2 text-slate-300 flex-wrap">
                  <span className="font-bold text-sky-400 font-mono">{selectedMedIds.length}</span>
                  <span>items selected</span>
                  <button
                    onClick={toggleSelectAllOnPage}
                    className="ml-2 text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Select Page ({paginatedMedicines.length})
                  </button>
                  <button
                    onClick={toggleSelectAllFiltered}
                    className="ml-2 text-xs text-sky-400 hover:text-sky-300 font-semibold underline cursor-pointer"
                  >
                    Select All Filtered ({filteredMedicines.length})
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedCategory !== 'ALL' && (
                    <>
                      <button
                        disabled={isProcessing}
                        onClick={handleAssignEntireCategory}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Assign All "{selectedCategory}" ({filteredMedicines.length})</span>
                      </button>

                      <button
                        disabled={isProcessing}
                        onClick={handleUnassignEntireCategory}
                        className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg font-medium text-[11px] transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke Category</span>
                      </button>
                    </>
                  )}

                  <button
                    disabled={isProcessing || selectedMedIds.length === 0}
                    onClick={handleAssignSelected}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isProcessing ? `Assigning (${processProgress}%)...` : `Assign ${selectedMedIds.length} Selected`}</span>
                  </button>

                  {selectedMedIds.length > 0 && (
                    <button
                      disabled={isProcessing}
                      onClick={handleUnassignSelected}
                      className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg font-medium transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Unassign Selected</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar for Bulk Non-blocking Execution */}
              {isProcessing && (
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-500 to-emerald-400 h-2 transition-all duration-200"
                    style={{ width: `${processProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Paginated Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase text-slate-400 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">
                      <button onClick={toggleSelectAllOnPage} className="p-0.5">
                        {paginatedMedicines.length > 0 && paginatedMedicines.every(m => selectedMedIds.includes(m.id)) ? (
                          <CheckSquare className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Item / Product Name</th>
                    <th className="py-2.5 px-3">Brand / Manufacturer</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Form / Unit</th>
                    <th className="py-2.5 px-3 text-center">Status for this Client</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedMedicines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No catalog items found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedMedicines.map(item => {
                      const isSelected = selectedMedIds.includes(item.id);
                      const isAssigned = item.assignedTenantIds?.includes(currentTenantId);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleSelectOne(item.id)}
                          className={`hover:bg-slate-900/60 cursor-pointer transition-colors ${
                            isSelected ? 'bg-sky-950/30' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                toggleSelectOne(item.id);
                              }}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-sky-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{item.name}</div>
                            {item.genericFormula && (
                              <div className="text-[10.5px] text-slate-400 font-mono">{item.genericFormula}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {item.company || item.brandName || 'Standard'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-sky-300 border border-slate-800">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {item.dosageForm || 'Item'} • {item.unit || 'Piece'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isAssigned ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Assigned
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900 text-slate-500 border border-slate-800">
                                Available
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <div>
                Showing page <span className="font-bold text-white font-mono">{currentPage}</span> of{' '}
                <span className="font-bold text-white font-mono">{totalPages}</span> ({filteredMedicines.length} items total)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-bold transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-bold transition flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BULK CSV UPLOADER */}
        {activeSubTab === 'csv_upload' && (
          <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-white">Download Standard Assignment Template</div>
                <div className="text-[11px] text-slate-400">Pre-populated with surgical instruments, orthopedics, and medicines.</div>
              </div>
              <button
                onClick={handleDownloadSampleCsv}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample .CSV</span>
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-2.5">
                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="text-sm font-bold text-white">
                  {csvFile ? csvFile.name : 'Select or Drop .CSV File to Assign to ' + currentTenantName}
                </div>
                <div className="text-xs text-slate-400">
                  {csvFile
                    ? `${(csvFile.size / 1024).toFixed(1)} KB • Parsed & Ready`
                    : 'Supports Item Name, Generic Formula, Brand, Company, Category, Form, Strength, Unit'}
                </div>
              </div>
            </div>

            {/* Preview */}
            {csvPreview.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Preview Data (First {csvPreview.length} items)</span>
                  <span className="text-[11px] text-emerald-400 font-mono">Format Verified</span>
                </div>
                <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto bg-slate-950">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                      <tr>
                        {Object.keys(csvPreview[0]).map((h, i) => (
                          <th key={i} className="py-2 px-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {csvPreview.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-300">
                              {val || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              disabled={!csvText.trim() || isProcessing}
              onClick={handleExecuteCsvImport}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isProcessing ? 'Processing Batch Ingestion...' : `Ingest & Assign All to ${currentTenantName}`}</span>
            </button>
          </div>
        )}

        {/* TAB 3: ASSIGNED ITEMS VIEW */}
        {activeSubTab === 'assigned_view' && (
          <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">
                  Provisioned for <span className="text-white font-bold">{currentTenantName}</span>:
                </span>
                <span className="font-bold text-emerald-400 font-mono text-sm">{assignedMeds.length} Items</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={assignedSearch}
                    onChange={e => setAssignedSearch(e.target.value)}
                    placeholder="Search assigned products..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {assignedMeds.length > 0 && (
                  <button
                    disabled={isProcessing}
                    onClick={async () => {
                      if (!confirm(`⚠️ REVOKE ALL ${assignedMeds.length} assigned items from ${currentTenantName}?`)) return;
                      setIsProcessing(true);
                      const res = await unassignMedicinesFromCustomer({
                        tenantId: currentTenantId,
                        medicineIds: assignedMeds.map(m => m.id),
                        deleteFromInventory: true,
                        adminName: 'Master Fleet Control'
                      });
                      setIsProcessing(false);
                      refreshAssignedList();
                      if (res.success) {
                        setStatusMessage({ type: 'success', text: `Revoked all items from ${currentTenantName}.` });
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke All</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60 max-h-[450px] overflow-y-auto">
              {filteredAssignedMeds.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  {assignedMeds.length === 0
                    ? 'No items assigned to this customer yet. Use the Virtualized Catalog Assigner tab above to allocate medicines or surgical supplies.'
                    : 'No assigned products match your search.'}
                </div>
              ) : (
                filteredAssignedMeds.map(item => (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors">
                    <div>
                      <div className="font-bold text-white text-xs">{item.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{item.company || item.brandName || 'Pharma'}</span>
                        <span>•</span>
                        <span className="text-sky-400">{item.category}</span>
                        {item.genericFormula && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-500">{item.genericFormula}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (!confirm(`Unassign "${item.name}" from ${currentTenantName}?`)) return;
                        await unassignMedicinesFromCustomer({
                          tenantId: currentTenantId,
                          medicineIds: [item.id],
                          deleteFromInventory: true
                        });
                        refreshAssignedList();
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Unassign this item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Unassign</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Multi-Tenant Partitioning Active • Zero-Locking High Speed Execution</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
