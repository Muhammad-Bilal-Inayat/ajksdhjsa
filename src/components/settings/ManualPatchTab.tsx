import React, { useState, useEffect } from 'react';
import { 
  Cpu, Upload, FileCode, CheckCircle2, AlertTriangle, ShieldCheck, 
  Sparkles, Download, Copy, Trash2, Power, Eye, Plus, ArrowRight,
  Info, RefreshCw, Key, Layers, Package, ShoppingBag, Shield, Check, X
} from 'lucide-react';
import { manualPatchService, InstalledPatch, FeaturePatchPayload } from '../../lib/manualPatchService';
import { useAuth } from '../../contexts/AuthContext';
import { emitToast } from '../../contexts/ToastContext';

export const ManualPatchTab: React.FC = () => {
  const { tenant, tenantId } = useAuth();
  const [installedPatches, setInstalledPatches] = useState<InstalledPatch[]>([]);
  const [activeInputMode, setActiveInputMode] = useState<'upload' | 'paste'>('upload');
  const [pastedCode, setPastedCode] = useState('');
  const [previewPatch, setPreviewPatch] = useState<FeaturePatchPayload | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Developer Generator State
  const [showGenerator, setShowGenerator] = useState(false);
  const [genTitle, setGenTitle] = useState('Custom Multi-Godown & Warehouse Patch');
  const [genDesc, setGenDesc] = useState('Enables multi-godown stock transfers and secondary store allocations');
  const [genTargetTid, setGenTargetTid] = useState(tenantId || '*');
  const [genFeatures, setGenFeatures] = useState<string>('godowns, godown_management, stock_transfer, multi_warehouse');
  const [genRoutes, setGenRoutes] = useState<string>('/godowns, /stock-transfer');
  const [genMaxGodowns, setGenMaxGodowns] = useState<number>(5);
  const [genMaxUsers, setGenMaxUsers] = useState<number>(10);
  const [genExpiryDays, setGenExpiryDays] = useState<number>(0);
  const [generatedOutput, setGeneratedOutput] = useState<{ rawCode: string; encodedBase64: string } | null>(null);

  const loadPatches = () => {
    setInstalledPatches(manualPatchService.getInstalledPatches(tenantId));
  };

  useEffect(() => {
    loadPatches();
    const handlePatchEvent = () => loadPatches();
    window.addEventListener('mbi-patch-applied', handlePatchEvent);
    return () => window.removeEventListener('mbi-patch-applied', handlePatchEvent);
  }, [tenantId]);

  // Handle File Upload (.mbipatch, .json, .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setPreviewPatch(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const { patch, error } = manualPatchService.parsePatch(content);
      if (error || !patch) {
        setValidationError(error || 'Failed to read patch file.');
      } else {
        setPreviewPatch(patch);
      }
    };
    reader.readAsText(file);
  };

  // Handle Pasted Code Change
  const handleCodeChange = (text: string) => {
    setPastedCode(text);
    setValidationError(null);
    setPreviewPatch(null);

    if (text.trim()) {
      const { patch, error } = manualPatchService.parsePatch(text.trim());
      if (error || !patch) {
        setValidationError(error);
      } else {
        setPreviewPatch(patch);
      }
    }
  };

  // Apply Patch
  const handleApplyPatch = async () => {
    if (!previewPatch) return;
    setIsApplying(true);
    try {
      const res = manualPatchService.applyPatch(JSON.stringify(previewPatch), tenantId);
      if (res.success) {
        emitToast(res.message, 'success');
        setPreviewPatch(null);
        setPastedCode('');
        loadPatches();
      } else {
        setValidationError(res.message);
      }
    } finally {
      setIsApplying(false);
    }
  };

  // Remove Patch
  const handleRemovePatch = (patchId: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove patch "${title}"? Any features unlocked by this patch will be disabled.`)) {
      manualPatchService.removePatch(patchId);
      emitToast(`Patch "${title}" removed.`, 'info');
      loadPatches();
    }
  };

  // Toggle Patch Status
  const handleTogglePatch = (patchId: string) => {
    manualPatchService.togglePatchStatus(patchId);
    loadPatches();
  };

  // Developer Generator Handlers
  const handleGeneratePatch = () => {
    const featureList = genFeatures.split(',').map(s => s.trim()).filter(Boolean);
    const routeList = genRoutes.split(',').map(s => s.trim()).filter(Boolean);

    const res = manualPatchService.generatePatch({
      title: genTitle,
      description: genDesc,
      targetTenantId: genTargetTid,
      features: featureList,
      routes: routeList,
      limitsExpansion: {
        maxGodowns: Number(genMaxGodowns) || undefined,
        maxStaffUsers: Number(genMaxUsers) || undefined,
      },
      expiresInDays: genExpiryDays > 0 ? genExpiryDays : null,
      issuedBy: 'MBI Inventra Master Engineer'
    });

    setGeneratedOutput(res);
  };

  const handleDownloadPatchFile = () => {
    if (!generatedOutput) return;
    const blob = new Blob([generatedOutput.encodedBase64], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${genTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.mbipatch`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyPatchCode = () => {
    if (!generatedOutput) return;
    navigator.clipboard.writeText(generatedOutput.encodedBase64);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    emitToast('Patch code copied to clipboard!', 'success');
  };

  // Generator Presets
  const applyPreset = (preset: string) => {
    if (preset === 'GODOWNS') {
      setGenTitle('Godowns & Multi-Warehouse Addon');
      setGenDesc('Unlocks secondary warehouse godowns, bin locations, and inter-store transfers');
      setGenFeatures('godowns, godown_management, stock_transfer, multi_warehouse');
      setGenRoutes('/godowns, /stock-transfer');
      setGenMaxGodowns(5);
    } else if (preset === 'ONLINE_STORE') {
      setGenTitle('Digital Pharmacy Online Storefront');
      setGenDesc('Enables public digital catalog, WhatsApp customer order reception, and web store');
      setGenFeatures('online_store, online_storefront, customer_store_portal');
      setGenRoutes('/online-store');
    } else if (preset === 'AUDIT_TRAIL') {
      setGenTitle('Enterprise System Audit Trail & Security Center');
      setGenDesc('Unlocks immutable staff activity logs, invoice tampering tracking, and shift audits');
      setGenFeatures('full_audit_trail, security_audit, staff_activity_monitor');
      setGenRoutes('/audit-trail');
    } else if (preset === 'EXTRA_USERS') {
      setGenTitle('Staff Users Expansion (+10 Cashiers)');
      setGenDesc('Increases allowed staff user logins to 10 concurrent billers/salesmen');
      setGenFeatures('extra_users_addon');
      setGenRoutes('');
      setGenMaxUsers(10);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
            <Cpu className="w-6 h-6 text-blue-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
                Manual Feature Patch & Addon Installer
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30">
                CLIENT ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Upload custom feature patches (<strong>.mbipatch</strong> or Patch Code) supplied by the engineering team to activate extra modules, warehouse godowns, online storefronts, or higher limits instantly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={() => setShowGenerator(!showGenerator)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{showGenerator ? 'Hide Patch Generator' : 'Developer Generator'}</span>
          </button>
        </div>
      </div>

      {/* Developer Generator (Hidden / Collapsible) */}
      {showGenerator && (
        <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 p-5 rounded-2xl border border-indigo-500/40 shadow-md space-y-4 animate-in slide-in-from-top-3">
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Developer / Master Patch Creator</h2>
              <span className="text-[10px] px-2 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-bold">
                ENGINEERING TOOL
              </span>
            </div>
            <span className="text-xs text-slate-400">Generate `.mbipatch` file for any client</span>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Quick Feature Presets:</label>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => applyPreset('GODOWNS')}
                className="px-2.5 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 text-xs font-semibold cursor-pointer"
              >
                + Multi-Godown Warehouse
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ONLINE_STORE')}
                className="px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-semibold cursor-pointer"
              >
                + Online Storefront
              </button>
              <button
                type="button"
                onClick={() => applyPreset('AUDIT_TRAIL')}
                className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 text-xs font-semibold cursor-pointer"
              >
                + Audit Trail & Security
              </button>
              <button
                type="button"
                onClick={() => applyPreset('EXTRA_USERS')}
                className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700 text-xs font-semibold cursor-pointer"
              >
                + 10 Extra Staff Users
              </button>
            </div>
          </div>

          {/* Generator Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Patch Title</label>
              <input
                type="text"
                value={genTitle}
                onChange={e => setGenTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                placeholder="e.g. Godowns Warehouse Addon"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Target Tenant ID (* for any)</label>
              <input
                type="text"
                value={genTargetTid}
                onChange={e => setGenTargetTid(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                placeholder="* or tenant-uuid"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-bold mb-1">Unlocked Feature Keys (comma separated)</label>
              <input
                type="text"
                value={genFeatures}
                onChange={e => setGenFeatures(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                placeholder="godowns, online_store, custom_reports"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-bold mb-1">Unlocked Routes (comma separated)</label>
              <input
                type="text"
                value={genRoutes}
                onChange={e => setGenRoutes(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                placeholder="/godowns, /online-store"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Max Godowns Limit (Optional)</label>
              <input
                type="number"
                value={genMaxGodowns}
                onChange={e => setGenMaxGodowns(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Expiry in Days (0 for Permanent Lifetime)</label>
              <input
                type="number"
                value={genExpiryDays}
                onChange={e => setGenExpiryDays(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleGeneratePatch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
            >
              Generate Signed Patch Code
            </button>
          </div>

          {/* Generated Result */}
          {generatedOutput && (
            <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Patch Generated & Digitally Signed!
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPatchFile}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .mbipatch</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPatchCode}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                rows={3}
                value={generatedOutput.encodedBase64}
                className="w-full p-2 bg-slate-900 text-slate-300 font-mono text-[11px] rounded-lg border border-slate-800 focus:outline-hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* User Patch Upload / Apply Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Install New Feature Patch</span>
            </h2>
            <p className="text-xs text-slate-500">
              Select your downloaded <strong>.mbipatch</strong> file or paste the patch text provided by your software provider.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveInputMode('upload')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeInputMode === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setActiveInputMode('paste')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeInputMode === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Paste Code
            </button>
          </div>
        </div>

        {/* Upload Mode */}
        {activeInputMode === 'upload' ? (
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 sm:p-8 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              id="patch-file-input"
              accept=".mbipatch,.json,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="patch-file-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <FileCode className="w-6 h-6" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                Click to browse or drop your <code className="bg-slate-200 px-1 py-0.5 rounded text-blue-700">.mbipatch</code> file here
              </span>
              <span className="text-[11px] text-slate-400">
                Supports verified .mbipatch and encrypted feature patch files
              </span>
            </label>
          </div>
        ) : (
          /* Paste Mode */
          <div className="space-y-2">
            <textarea
              rows={4}
              value={pastedCode}
              onChange={e => handleCodeChange(e.target.value)}
              placeholder="Paste MBI-PATCH-v1:... or raw patch JSON here..."
              className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        )}

        {/* Validation Error Message */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Verified Patch Preview Card */}
        {previewPatch && (
          <div className="bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-slate-50 p-4 sm:p-5 rounded-2xl border border-blue-200 space-y-3.5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  VERIFIED DIGITAL PATCH
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 mt-1">
                  {previewPatch.title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">{previewPatch.description}</p>
              </div>

              <div className="text-right text-[11px] text-slate-500">
                <div>Patch ID: <code className="font-bold text-slate-700">{previewPatch.patchId}</code></div>
                <div>Issued: <span className="font-medium">{new Date(previewPatch.issuedAt).toLocaleDateString()}</span></div>
              </div>
            </div>

            {/* Unlocked Features & Routes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Unlocked Features ({previewPatch.features.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {previewPatch.features.map(f => (
                    <span key={f} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Unlocked Routes ({previewPatch.routes.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {previewPatch.routes.map(r => (
                    <span key={r} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Limits Expansion notice */}
            {previewPatch.limitsExpansion && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Expanded Plan Limits:</strong>{' '}
                  {previewPatch.limitsExpansion.maxGodowns && `Godowns: ${previewPatch.limitsExpansion.maxGodowns} `}
                  {previewPatch.limitsExpansion.maxStaffUsers && `Staff Users: ${previewPatch.limitsExpansion.maxStaffUsers} `}
                  {previewPatch.limitsExpansion.maxFirms && `Firms: ${previewPatch.limitsExpansion.maxFirms} `}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPreviewPatch(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPatch}
                disabled={isApplying}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isApplying ? 'Applying Patch...' : 'Apply & Activate Patch'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Installed Patches Registry */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Installed Active Patches</span>
            </h2>
            <p className="text-xs text-slate-500">
              Active custom feature patches running on this business instance.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {installedPatches.length} Active
          </span>
        </div>

        {installedPatches.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <Cpu className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No custom feature patches applied yet.</p>
            <p className="text-[11px] text-slate-400">
              Your software is operating on standard base plan features. When your provider issues a feature patch, upload it above to activate.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {installedPatches.map(patch => (
              <div 
                key={patch.patchId}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors bg-white shadow-2xs space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-slate-900">{patch.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        patch.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}>
                        {patch.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{patch.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePatch(patch.patchId)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title={patch.status === 'ACTIVE' ? 'Disable Patch' : 'Enable Patch'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePatch(patch.patchId, patch.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Uninstall Patch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                  <span className="text-slate-400 font-medium">Features:</span>
                  {patch.features.map(f => (
                    <span key={f} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold">
                      {f}
                    </span>
                  ))}
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400">Installed: {new Date(patch.installedAt).toLocaleDateString()}</span>
                  {patch.expiresAt && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-amber-600">Expires: {new Date(patch.expiresAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
