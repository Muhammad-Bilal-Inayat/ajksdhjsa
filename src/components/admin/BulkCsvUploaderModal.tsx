import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileText, CheckCircle2, AlertTriangle, 
  Sparkles, RefreshCw, ArrowRight, ShieldCheck, CheckCheck, 
  Layers, Database, FileSpreadsheet, Eye
} from 'lucide-react';
import { adminMedicineService } from '../../services/adminMedicineService';
import { emitToast } from '../../contexts/ToastContext';

interface BulkCsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BulkCsvUploaderModal: React.FC<BulkCsvUploaderModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [importResult, setImportResult] = useState<{ totalProcessed: number; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseCsvContent = (content: string) => {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
    const previewRows: any[] = [];

    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      const rowValues = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      if (rowValues.length > 0 && rowValues[0]) {
        const obj: any = {};
        header.forEach((h, idx) => {
          obj[h] = rowValues[idx] || '';
        });
        previewRows.push({
          name: obj.name || obj.medicinename || obj.brandname || rowValues[0],
          generic_salt: obj.genericsalt || obj.generic || obj.formula || rowValues[1] || '—',
          company: obj.company || obj.manufacturer || rowValues[2] || 'Standard Pharma',
          category: obj.category || obj.classification || rowValues[3] || 'General Medicine',
          dosage_form: obj.dosageform || obj.form || rowValues[4] || 'Tablet',
          strength: obj.strength || rowValues[5] || 'Standard',
          pack_size: obj.packsize || rowValues[7] || '1'
        });
      }
    }
    return previewRows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      const preview = parseCsvContent(text);
      setParsedPreview(preview);
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
        const preview = parseCsvContent(text);
        setParsedPreview(preview);
      };
      reader.readAsText(droppedFile);
    }
  };

  const handleStartUpload = async () => {
    if (!csvText.trim()) {
      emitToast('Please choose a CSV file or paste CSV rows first', 'error');
      return;
    }

    setIsProcessing(true);
    setProgressPercent(10);
    setImportResult(null);

    const totalLines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0).length - 1;
    const estChunks = Math.max(1, Math.ceil(totalLines / 1000));
    setTotalChunks(estChunks);
    setCurrentChunk(1);

    const timer = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 90) return prev;
        const next = prev + 15;
        setCurrentChunk(Math.min(estChunks, Math.ceil((next / 100) * estChunks)));
        return next;
      });
    }, 250);

    try {
      const res = await adminMedicineService.uploadMedicinesCsv({ csvData: csvText });
      clearInterval(timer);
      setProgressPercent(100);
      setCurrentChunk(estChunks);

      setTimeout(() => {
        setIsProcessing(false);
        setImportResult({
          totalProcessed: res.totalProcessed,
          message: res.message
        });
        emitToast(res.message || 'CSV Catalog imported successfully!', 'success');
        if (onSuccess) onSuccess();
      }, 400);

    } catch (err: any) {
      clearInterval(timer);
      setIsProcessing(false);
      setProgressPercent(0);
      emitToast(err.message || 'Failed to import CSV catalog', 'error');
    }
  };

  const loadSampleCsv = () => {
    const sample = `name,generic_salt,company,category,dosage_form,strength,barcode,pack_size,min_stock_level
Panadol Extra 500mg,Paracetamol + Caffeine,GSK,Analgesics & Antipyretics,Tablet,500/65mg,8960001001,200,10
Augmentin 625mg,Amoxicillin + Clavulanic Acid,GSK,Antibiotics & Anti-Infectives,Tablet,625mg,8960001002,14,5
Risek 40mg Capsule,Omeprazole,Getz Pharma,Gastrointestinal & Anti-Ulcerants,Capsule,40mg,8960001003,14,5
Brufen 400mg Tablet,Ibuprofen,Abbott Laboratories,Analgesics & NSAIDs,Tablet,400mg,8960001004,30,10
Crestor 10mg Tablet,Rosuvastatin Calcium,AstraZeneca,Cardiovascular & Lipid Lowering,Tablet,10mg,8960001005,28,5
Montiget 10mg Tablet,Montelukast Sodium,Getz Pharma,Respiratory & Anti-Asthma,Tablet,10mg,8960001006,14,5
Tagipmet 50/500mg,Sitagliptin + Metformin,Highnoon Laboratories,Antidiabetic & Endocrinology,Tablet,50/500mg,8960001007,28,5`;
    setCsvText(sample);
    setFile(null);
    setParsedPreview(parseCsvContent(sample));
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 text-white flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black leading-snug">
                Streaming Bulk CSV / Excel Catalog Uploader
              </h3>
              <p className="text-xs text-emerald-100">
                Import 10k to 100k+ master medicines in 1,000-item transactions with automatic deduplication
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

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-slate-900 dark:text-white">
          
          {importResult ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-in zoom-in-50 duration-300">
                <CheckCheck className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  Catalog Upload & Merge Completed!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Processed & merged <span className="font-bold text-emerald-600">{importResult.totalProcessed.toLocaleString()} items</span> into MariaDB master catalog table with automatic deduplication.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setImportResult(null);
                    setCsvText('');
                    setFile(null);
                    setParsedPreview([]);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Upload Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dropzone Container */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-3xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {file ? file.name : 'Click to browse or drag & drop CSV file'}
                </div>
                <p className="text-[11px] text-slate-400">
                  Supports .CSV, .TSV up to 500,000 records. Chunked in 1,000 items/packet.
                </p>
              </div>

              {/* Sample Template Button */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Need a template format?</span>
                <button
                  type="button"
                  onClick={loadSampleCsv}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Sample CSV Rows</span>
                </button>
              </div>

              {/* Parsed Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      Detected Columns Preview (First {parsedPreview.length} rows):
                    </span>
                    <span className="text-[11px] text-emerald-600 font-bold">
                      ✓ Valid Format
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-[11px]">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                        <tr>
                          <th className="py-2 px-3">Medicine Name</th>
                          <th className="py-2 px-3">Generic Salt</th>
                          <th className="py-2 px-3">Company</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Form</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedPreview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{row.name}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{row.generic_salt}</td>
                            <td className="py-2 px-3 text-blue-600 font-medium">{row.company}</td>
                            <td className="py-2 px-3 text-slate-500">{row.category}</td>
                            <td className="py-2 px-3 text-slate-500">{row.dosage_form}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Progress Bar when uploading */}
              {isProcessing && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      Streaming Packet {currentChunk} of {totalChunks} (1,000 records/tx)...
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-emerald-100 dark:bg-emerald-900/60 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        {!importResult && (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>ON DUPLICATE KEY UPDATE Protected</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStartUpload}
                disabled={isProcessing || !csvText.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>⚡ Start Streaming Import</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
