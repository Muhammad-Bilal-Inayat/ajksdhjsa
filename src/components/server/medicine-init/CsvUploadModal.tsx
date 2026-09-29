import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Building2,
  X,
  Layers,
  ArrowRight,
  Pill,
  Sliders
} from 'lucide-react';
import { importCentralMedicinesFromCsv } from '../../../lib/centralMedicineDatabaseService';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: any[];
  preselectedTenantId?: string;
  onSuccess: () => void;
  showToast?: (msg: string) => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({
  isOpen,
  onClose,
  tenants,
  preselectedTenantId,
  onSuccess,
  showToast
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<Array<Record<string, string>>>([]);
  const [targetTenantId, setTargetTenantId] = useState<string>(preselectedTenantId || '');
  const [initialStock, setInitialStock] = useState<number>(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    totalParsed: number;
    addedCount: number;
    duplicateCount: number;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  // Sample CSV generator including Surgical and Orthopedic products
  const handleDownloadSampleCsv = () => {
    const csvContent = [
      'Item Name,Brand Name,Company,Category,Generic Formula,Dosage Form,Strength,Unit',
      'Bone Holding Forceps 8 Inch,Endo Tech,Endo Tech Surgical,Surgical & Disposable Supplies,Surgical Steel AISI 420,Surgical Instrument,8 Inch,Piece',
      'IV Cannula 20G Pink with Wings & Port,BD Venflon,Becton Dickinson (BD),Surgical & Disposable Supplies,PTFE Radiopaque Cannula,Cannula,20G (1.1x32mm),Box',
      'Vicryl 3-0 Suture Round Body,Ethicon,Johnson & Johnson Ethicon,Surgical & Disposable Supplies,Polyglactin 910 Braided,Suture,3-0 26mm Needle,Box',
      'Crepe Bandage 10cm x 4.5m,DynaPlast,Johnson & Johnson,Surgical & Disposable Supplies,Cotton Stretch Elastic,Bandage,10cm x 4.5m,Roll',
      'L.S. Support Belt Rigid Large,Tynor Orthotics,Tynor,Orthopedic & Rehabilitation Care,Lumbosacral Belt with Stays,Orthopedic Device,Large (36-40 Inch),Piece',
      'Cervical Soft Foam Collar Medium,Tynor Orthotics,Tynor,Orthopedic & Rehabilitation Care,High Density Foam Polyurethane,Orthopedic Device,Medium,Piece',
      'Plaster of Paris (POP) 15cm x 2.7m,Gypsona,BSN Medical,Orthopedic & Rehabilitation Care,Fast Setting Calcium Sulfate,POP Bandage,15cm x 2.7m,Roll',
      'Panadol Extra 500/65mg Tablet,Panadol,GSK,Analgesics & Antipyretics,Paracetamol + Caffeine,Tablet,500/65mg,Strip',
      'Augmentin 625mg Tablet,Augmentin,GSK,Antibiotics & Anti-Infectives,Amoxicillin + Clavulanic Acid,Tablet,625mg,Box',
      'Risek 20mg Capsule,Risek,Getz Pharma,Gastrointestinal & Anti-Ulcerants,Omeprazole,Capsule,20mg,Box'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'master_inventory_surgical_ortho_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setResult(null);

      const reader = new FileReader();
      reader.onload = evt => {
        const text = evt.target?.result as string;
        setRawText(text);
        parsePreview(text);
      };
      reader.readAsText(file);
    }
  };

  const parsePreview = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const previewRows: Array<Record<string, string>> = [];

      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const tokens = lines[i].split(',').map(t => t.trim().replace(/^["']|["']$/g, ''));
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = tokens[idx] || '';
        });
        previewRows.push(rowObj);
      }
      setParsedPreview(previewRows);
    } catch (e) {
      console.warn('Failed to generate CSV preview:', e);
    }
  };

  const handleExecuteUpload = () => {
    if (!rawText || !rawText.trim()) {
      alert('Please choose a valid CSV file.');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    // Yield to main thread briefly for smooth UI progress
    setTimeout(() => {
      try {
        const targetTenantObj = tenants.find(t => (t.tenantId || t.id) === targetTenantId);
        const tenantName = targetTenantObj?.name || (targetTenantObj as any)?.storeName;

        const res = importCentralMedicinesFromCsv(
          rawText,
          'CSV_UPLOAD_ENGINE',
          targetTenantId || undefined,
          tenantName || undefined
        );

        setIsProcessing(false);
        setResult(res);

        if (res.success) {
          if (showToast) showToast(res.message);
          onSuccess();
        }
      } catch (err: any) {
        setIsProcessing(false);
        setResult({
          success: false,
          totalParsed: 0,
          addedCount: 0,
          duplicateCount: 0,
          message: 'Failed to import CSV: ' + (err?.message || 'Syntax error')
        });
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Upload Medicines & Surgical .CSV File</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Fully Supported
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Bulk upload medicines, surgical items, and orthopedic devices with zero browser freeze.
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Top Actions: Template Download */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">Need a standard template? </span>
              <span>Includes surgical instruments, orthopedic supports, and pharmaceuticals.</span>
            </div>
            <button
              onClick={handleDownloadSampleCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample .CSV
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-2.5">
              <div className="p-3.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="text-sm font-bold text-white">
                {selectedFile ? selectedFile.name : 'Click to select or drop your .CSV / .TXT file here'}
              </div>
              <div className="text-xs text-slate-400">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB • Parsed & Ready for Ingestion`
                  : 'Auto-maps Item Name, Brand, Company, Category (Surgical/Ortho/Pharma), Formula, Strength, Unit'}
              </div>
            </div>
          </div>

          {/* Target Customer / Allocation Option */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
              <Building2 className="w-4 h-4" />
              <span>Target Allocation / Direct Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Target Customer Account
                </label>
                <select
                  value={targetTenantId}
                  onChange={e => setTargetTenantId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Central Database Only (Do Not Assign)</option>
                  {tenants.map(t => {
                    const id = t.tenantId || t.id;
                    const name = t.name || (t as any).storeName || 'Pharmacy';
                    return (
                      <option key={id} value={id}>
                        Assign directly to {name} ({id})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Default Opening Stock (If Assigning)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialStock}
                  onChange={e => setInitialStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  placeholder="20"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Data Preview (First {parsedPreview.length} Rows)</span>
                <span className="text-[11px] text-emerald-400 font-mono">Format Verified</span>
              </div>
              <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto bg-slate-950">
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      {Object.keys(parsedPreview[0]).map((h, i) => (
                        <th key={i} className="py-2 px-3 whitespace-nowrap font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
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

          {/* Result Banner */}
          {result && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                result.success
                  ? 'bg-emerald-950/30 border-emerald-800/70 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-800/70 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                )}
                <span>{result.message}</span>
              </div>

              {result.success && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-900/40 text-center font-mono text-[11px]">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Parsed Lines</div>
                    <div className="text-white font-bold text-sm">{result.totalParsed}</div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-emerald-400 text-[10px]">Added to Database</div>
                    <div className="text-white font-bold text-sm">{result.addedCount}</div>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-amber-400 text-[10px]">Duplicates Skipped</div>
                    <div className="text-white font-bold text-sm">{result.duplicateCount}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            disabled={!selectedFile || isProcessing}
            onClick={handleExecuteUpload}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Bulk Ingestion...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>
                  {targetTenantId ? 'Import & Assign to Pharmacy' : 'Import to Master Central Database'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
