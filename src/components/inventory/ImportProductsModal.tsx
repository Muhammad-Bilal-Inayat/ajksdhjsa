import React, { useState, useRef, useMemo } from 'react';
import { 
  X, Upload, Download, FileSpreadsheet, Check, AlertCircle, 
  CheckCircle2, RefreshCw, Package, Sparkles, Building2, Layers, Search, Filter
} from 'lucide-react';
import { 
  downloadProductTemplateExcel, 
  parseProductsExcel, 
  ParsedProductRow 
} from '../../lib/excelUtils';
import { Medicine } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { getCentralMedicines, getCentralCompaniesSummary } from '../../lib/centralMedicineDatabaseService';

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
  onSaveProducts: (medicines: Medicine[]) => Promise<void>;
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onSaveProducts,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'excel'>('catalog');
  
  // Excel File State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-Loaded 5,000+ Catalog State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedMedIds, setSelectedMedIds] = useState<Set<string>>(new Set());

  const allCentralMedicines = useMemo(() => getCentralMedicines(), []);
  const companiesSummary = useMemo(() => getCentralCompaniesSummary(), []);

  // Distinct Categories
  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    allCentralMedicines.forEach(m => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set).sort();
  }, [allCentralMedicines]);

  // Filtered Catalog Items
  const filteredCatalogMedicines = useMemo(() => {
    return allCentralMedicines.filter(m => {
      if (selectedCompanyFilter !== 'ALL') {
        const comp = m.company || m.brandName || '';
        if (comp.toLowerCase() !== selectedCompanyFilter.toLowerCase()) return false;
      }
      if (selectedCategoryFilter !== 'ALL') {
        if (m.category !== selectedCategoryFilter) return false;
      }
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase().trim();
        const matchesName = m.name?.toLowerCase().includes(q);
        const matchesGen = m.genericFormula?.toLowerCase().includes(q) || m.genericName?.toLowerCase().includes(q);
        const matchesComp = m.company?.toLowerCase().includes(q) || m.brandName?.toLowerCase().includes(q);
        if (!matchesName && !matchesGen && !matchesComp) return false;
      }
      return true;
    });
  }, [allCentralMedicines, selectedCompanyFilter, selectedCategoryFilter, catalogSearch]);

  if (!isOpen) return null;

  // Toggle selection for single item
  const handleToggleSelectMed = (id: string) => {
    setSelectedMedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all filtered
  const handleSelectAllFiltered = () => {
    if (selectedMedIds.size === filteredCatalogMedicines.length && filteredCatalogMedicines.length > 0) {
      setSelectedMedIds(new Set());
    } else {
      setSelectedMedIds(new Set(filteredCatalogMedicines.map(m => m.id)));
    }
  };

  // Import selected clean catalog medicines (qty: 0, salePrice: 0, purchasePrice: 0, mrp: 0, blank batch)
  const handleImportSelectedCatalog = async () => {
    const targetItems = allCentralMedicines.filter(m => selectedMedIds.has(m.id));
    if (targetItems.length === 0) return;

    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const newMedicines: Medicine[] = targetItems.map(m => {
        const genericStr = m.genericFormula || m.genericName || '';
        const companyStr = m.company || m.brandName || 'General Pharma';

        return {
          id: 'med_' + uuidv4().replace(/-/g, '').substring(0, 10),
          name: m.name,
          genericName: genericStr,
          genericFormula: genericStr,
          brandName: m.brandName || companyStr,
          dosageForm: (m.dosageForm as any) || 'Tablet',
          strength: m.strength || '',
          category: m.category || 'General Pharmacy',
          manufacturer: companyStr,
          company: companyStr,
          salePrice: 0,
          purchasePrice: 0,
          mrp: 0,
          sellingPrice: 0,
          quantity: 0,
          lowStockThreshold: 10,
          minStock: 10,
          unit: m.unit || 'Box',
          barcode: '',
          batchNumber: '',
          gstPercentage: 0,
          expiryDate: '',
          batches: [],
          createdAt: now,
          updatedAt: now
        } as unknown as Medicine;
      });

      await onSaveProducts(newMedicines);
      onImportSuccess(newMedicines.length);
      onClose();
    } catch (err) {
      console.error('Failed to import clean catalog medicines:', err);
      setErrorMsg('Failed to import clean catalog items to inventory database.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const rows = await parseProductsExcel(file);
      if (rows.length === 0) {
        setErrorMsg('No valid product rows found. Please ensure Medicine Names are provided.');
      } else {
        setParsedRows(rows);
      }
    } catch (err: any) {
      console.error('Error parsing product Excel:', err);
      setErrorMsg('Failed to parse Excel file. Please use the official Excel template.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmExcelImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    try {
      const newMedicines: Medicine[] = validRows.map(r => ({
        id: uuidv4(),
        name: r.name,
        genericName: r.genericFormula || '',
        genericFormula: r.genericFormula || '',
        category: r.category || 'General Pharmacy',
        unit: r.unit || 'PCS',
        barcode: r.barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
        batchNumber: r.batchNumber || 'B-01',
        manufacturer: r.manufacturer || 'Generic Pharma',
        expiryDate: r.expiryDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
        quantity: r.quantity,
        purchasePrice: r.purchasePrice,
        mrp: r.mrp,
        sellingPrice: r.sellingPrice,
        lowStockThreshold: r.lowStockThreshold || 20,
        gstPercentage: r.gstPercentage || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await onSaveProducts(newMedicines);
      onImportSuccess(newMedicines.length);
      handleReset();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save imported products to inventory database.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setExcelFile(null);
    setParsedRows([]);
    setErrorMsg(null);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Import Items & Medicine Catalog</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pre-loaded 5,000+ popular brand medicines or custom Excel/CSV upload</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs Pill */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'catalog'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>5,000+ Catalog</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'excel'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Custom Excel / CSV</span>
              </button>
            </div>

            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'catalog' ? (
            /* TAB 1: 5,000+ POPULAR MEDICINES PRE-LOADED CATALOG */
            <div className="space-y-4">
              {/* Top Banner Notice */}
              <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 p-4 rounded-xl border border-blue-500/30 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2 text-blue-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Clean Master Catalog Template (Zero Sensitive Pre-fills)</span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Pre-loaded with popular pharma companies (GSK, Abbott, Getz, Pfizer, Sanofi, Novartis, Sami, Hilton, Searle, etc.). 
                    Includes Item Name, Company, and Generic Formula with <strong>0 Qty, 0 MRP, 0 Price</strong> so you can set your own stock.
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-400/40 font-mono text-xs font-bold text-blue-200 shrink-0 self-start sm:self-auto">
                  {allCentralMedicines.length}+ Medicines Ready
                </div>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search by name, salt, or company..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Company Filter */}
                <div className="relative">
                  <select
                    value={selectedCompanyFilter}
                    onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="ALL">All Companies ({companiesSummary.length} Total)</option>
                    {companiesSummary.map(c => (
                      <option key={c.company} value={c.company}>
                        {c.company} ({c.totalItems} items)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Therapeutic Categories ({distinctCategories.length})</option>
                    {distinctCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selection Summary Bar */}
              <div className="flex items-center justify-between px-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {selectedMedIds.size === filteredCatalogMedicines.length && filteredCatalogMedicines.length > 0 ? 'Deselect All' : 'Select All Shown'}
                  </button>
                  <span className="text-slate-500 dark:text-slate-400">
                    Showing <strong>{filteredCatalogMedicines.length}</strong> items
                  </span>
                </div>

                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                  {selectedMedIds.size} medicines selected for import
                </div>
              </div>

              {/* Catalog Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedMedIds.size === filteredCatalogMedicines.length && filteredCatalogMedicines.length > 0}
                          onChange={handleSelectAllFiltered}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Medicine Name</th>
                      <th className="py-2.5 px-3">Company / Brand</th>
                      <th className="py-2.5 px-3">Generic Formula (Salt)</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Dosage Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCatalogMedicines.slice(0, 200).map((med) => {
                      const isSelected = selectedMedIds.has(med.id);
                      return (
                        <tr 
                          key={med.id}
                          onClick={() => handleToggleSelectMed(med.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50/70 dark:bg-blue-900/20 text-slate-900 dark:text-white' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectMed(med.id)}
                              className="rounded text-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                            {med.name}
                          </td>
                          <td className="py-2 px-3 font-semibold text-blue-700 dark:text-blue-400">
                            {med.company || med.brandName || 'General Pharma'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {med.genericFormula || med.genericName || '—'}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {med.category || 'General'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {med.dosageForm || 'Tablet'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* TAB 2: EXCEL / CSV CUSTOM FILE UPLOAD */
            <div className="space-y-6">
              {/* Step 1: Download Template */}
              <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Download Product Excel Template</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Includes formatted columns: Item Name, Barcode, Batch, Manufacturer, Expiry Date, Quantity, Purchase Price, Selling Price.
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadProductTemplateExcel}
                  className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Template (.xlsx)
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Upload Your Filled Excel File</h4>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-950/40 hover:bg-blue-50/20 cursor-pointer transition-colors"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xlsx, .xls, .csv"
                    className="hidden" 
                  />
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {excelFile ? excelFile.name : 'Click to select or drop your Excel/CSV file here'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls, and .csv formats</p>
                </div>
              </div>

              {/* Step 3: Parsed Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Preview Products ({validCount} Valid / {parsedRows.length} Total)
                      </h4>
                    </div>
                    <button 
                      onClick={handleReset}
                      className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-upload
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Item Name</th>
                          <th className="py-2.5 px-3">Batch</th>
                          <th className="py-2.5 px-3">Expiry</th>
                          <th className="py-2.5 px-3 text-center">Stock</th>
                          <th className="py-2.5 px-3 text-right">Cost Price</th>
                          <th className="py-2.5 px-3 text-right">Selling Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20'}>
                            <td className="py-2 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-[11px]">
                                  <Check className="w-3 h-3" /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-medium bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded text-[11px]">
                                  <AlertCircle className="w-3 h-3" /> Error
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{row.name}</td>
                            <td className="py-2 px-3 font-mono text-[11px]">{row.batchNumber}</td>
                            <td className="py-2 px-3">{row.expiryDate}</td>
                            <td className="py-2 px-3 text-center font-bold text-slate-800 dark:text-slate-200">{row.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono font-medium text-slate-600 dark:text-slate-300">
                              Rs {row.purchasePrice}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Rs {row.sellingPrice}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {activeTab === 'catalog' ? (
            <button
              onClick={handleImportSelectedCatalog}
              disabled={selectedMedIds.size === 0 || isProcessing}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
                selectedMedIds.size === 0 || isProcessing
                  ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 active:scale-98'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isProcessing ? 'Importing...' : `Import ${selectedMedIds.size} Clean Medicines to Inventory`}
            </button>
          ) : (
            <button
              onClick={handleConfirmExcelImport}
              disabled={validCount === 0 || isProcessing}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
                validCount === 0 || isProcessing
                  ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 active:scale-98'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isProcessing ? 'Importing...' : `Import ${validCount} Products`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
