import React, { useState, useEffect } from 'react';
import { 
  Cpu, Lock, Unlock, ShieldAlert, Key, X, CheckCircle2, 
  Sparkles, Terminal, Copy, Download, RefreshCw, FileCode,
  Layers, Upload, Check, Trash2, Power, Eye, EyeOff, Database, Server
} from 'lucide-react';
import { manualPatchService, InstalledPatch, FeaturePatchPayload } from '../../lib/manualPatchService';
import { useAuth } from '../../contexts/AuthContext';
import { emitToast } from '../../contexts/ToastContext';

// Single Private Master Engineering Passcode (Hidden from UI)
const MASTER_DEVELOPER_PIN = '7860';

export const SecretManualPatchModal: React.FC = () => {
  const { tenant, tenantId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'install' | 'generator' | 'installed' | 'database'>('install');

  // Patch Application State
  const [installedPatches, setInstalledPatches] = useState<InstalledPatch[]>([]);
  const [pastedCode, setPastedCode] = useState('');
  const [previewPatch, setPreviewPatch] = useState<FeaturePatchPayload | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Developer Generator State
  const [genTitle, setGenTitle] = useState('Custom Multi-Godown & Warehouse Patch');
  const [genDesc, setGenDesc] = useState('Enables multi-godown stock transfers and secondary store allocations');
  const [genTargetTid, setGenTargetTid] = useState(tenantId || '*');
  const [genFeatures, setGenFeatures] = useState<string>('godowns, godown_management, stock_transfer, multi_warehouse');
  const [genRoutes, setGenRoutes] = useState<string>('/godowns, /stock-transfer');
  const [genMaxGodowns, setGenMaxGodowns] = useState<number>(5);
  const [genMaxUsers, setGenMaxUsers] = useState<number>(10);
  const [genExpiryDays, setGenExpiryDays] = useState<number>(0);
  const [generatedOutput, setGeneratedOutput] = useState<{ rawCode: string; encodedBase64: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDbInfo, setCopiedDbInfo] = useState(false);

  const loadPatches = () => {
    setInstalledPatches(manualPatchService.getInstalledPatches(tenantId));
  };

  // Global Keyboard Shortcut: Ctrl + Shift + P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never trigger shortcut when focused inside /server path
      if (window.location.pathname.startsWith('/server')) return;

      const isPatchHotkey = 
        (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) ||
        (e.altKey && e.shiftKey && (e.key === 'P' || e.key === 'p'));

      if (isPatchHotkey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && isUnlocked) {
      loadPatches();
    }
  }, [isOpen, isUnlocked, tenantId]);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.trim() === MASTER_DEVELOPER_PIN) {
      setIsUnlocked(true);
      setPinError(null);
      loadPatches();
    } else {
      setPinError('Incorrect Master PIN.');
    }
  };

  const handleInspectPatch = () => {
    setValidationError(null);
    setPreviewPatch(null);
    const parsed = manualPatchService.parsePatch(pastedCode);
    if (parsed.error || !parsed.patch) {
      setValidationError(parsed.error || 'Failed to decode patch payload.');
      return;
    }
    setPreviewPatch(parsed.patch);
  };

  const handleApplyPatch = () => {
    if (!pastedCode.trim()) return;
    setIsApplying(true);
    try {
      const res = manualPatchService.applyPatch(pastedCode, tenantId);
      if (res.success) {
        emitToast(`✅ ${res.message}`, 'success');
        setPastedCode('');
        setPreviewPatch(null);
        loadPatches();
      } else {
        emitToast(`⚠️ ${res.message}`, 'warning');
      }
    } catch (e: any) {
      emitToast(`Error applying patch: ${e?.message}`, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const handleTogglePatch = (patchId: string) => {
    const toggled = manualPatchService.togglePatchStatus(patchId);
    if (toggled) {
      emitToast('Patch status updated', 'info');
      loadPatches();
    }
  };

  const handleRemovePatch = (patchId: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove feature patch: "${title}"?`)) {
      const removed = manualPatchService.removePatch(patchId);
      if (removed) {
        emitToast(`Patch "${title}" removed.`, 'info');
        loadPatches();
      }
    }
  };

  const handleGenerateCode = () => {
    const featList = genFeatures.split(',').map(s => s.trim()).filter(Boolean);
    const routeList = genRoutes.split(',').map(s => s.trim()).filter(Boolean);

    const out = manualPatchService.generatePatch({
      title: genTitle,
      description: genDesc,
      targetTenantId: genTargetTid,
      features: featList,
      routes: routeList,
      limitsExpansion: {
        maxGodowns: genMaxGodowns > 0 ? genMaxGodowns : undefined,
        maxStaffUsers: genMaxUsers > 0 ? genMaxUsers : undefined
      },
      expiresInDays: genExpiryDays > 0 ? genExpiryDays : null,
      issuedBy: 'Master Developer Terminal (MBI Inventra)'
    });

    setGeneratedOutput({ rawCode: out.rawCode, encodedBase64: out.encodedBase64 });
  };

  const handleCopyCode = () => {
    if (!generatedOutput) return;
    navigator.clipboard.writeText(generatedOutput.encodedBase64);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyDbInfo = () => {
    const serverDetails = `MBI INVENTRA SERVER ARCHITECTURE\nBackend: Node.js Express REST API (/api/*)\nDatabase: PostgreSQL / MySQL Multi-Tenant Isolated Schemas\nSync: Local-First Outbox Pattern`;
    navigator.clipboard.writeText(serverDetails);
    setCopiedDbInfo(true);
    setTimeout(() => setCopiedDbInfo(false), 2500);
  };

  const handlePresetSelect = (preset: string) => {
    if (preset === 'GODOWNS') {
      setGenTitle('Multi-Godown & Warehousing Expansion');
      setGenDesc('Unlocks 10 Godowns, stock inter-transfer logging, and warehouse batch filters');
      setGenFeatures('godowns, godown_management, stock_transfer, multi_warehouse');
      setGenRoutes('/godowns, /stock-transfer');
      setGenMaxGodowns(10);
    } else if (preset === 'NARCOTICS') {
      setGenTitle('Form 7 Narcotics & Controlled Drugs Module');
      setGenDesc('Enables strict narcotics register, doctor prescription logging, and controlled dispensing');
      setGenFeatures('narcotics_schedule, controlled_drugs, form7_registers');
      setGenRoutes('/narcotics-register');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in select-none">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-indigo-500/40 shadow-2xl text-white overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Terminal className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-wide text-white">
                  MBI Inventra — Developer Vault
                </h2>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  DEVELOPER ACCESS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Custom feature unlock terminal and runtime patches
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Gate / Passcode Screen (No password displayed on screen) */}
        {!isUnlocked ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1 max-w-sm">
              <h3 className="text-lg font-black text-white">Developer Security Gate</h3>
              <p className="text-xs text-slate-400">
                Enter Master Passcode to unlock Feature Patch Terminal.
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="w-full max-w-xs space-y-3">
              <div>
                <input 
                  type="password"
                  autoFocus
                  maxLength={6}
                  placeholder="••••"
                  value={enteredPin}
                  onChange={e => setEnteredPin(e.target.value)}
                  className="w-full text-center tracking-[0.5em] text-lg font-mono py-2.5 px-4 bg-slate-950 border border-indigo-500/30 rounded-xl text-white focus:outline-hidden focus:border-indigo-400"
                />
              </div>

              {pinError && (
                <p className="text-xs font-semibold text-rose-400 flex items-center justify-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Authenticate &amp; Unlock</span>
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked Multi-Tab Engineering Console */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-1.5 px-5 pt-3 border-b border-white/5 bg-slate-950/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('install')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'install' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Install Patch</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('installed')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'installed' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Active Patches ({installedPatches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('generator')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'generator' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Patch Creator</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'database' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Database Status</span>
              </button>
            </div>

            {/* Scrollable Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* TAB 1: INSTALL / UPLOAD PATCH */}
              {activeTab === 'install' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Upload className="w-4 h-4 text-indigo-400" />
                        <span>Install Feature Patch for Current Client</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Target Tenant: <code className="text-indigo-300 font-mono">{tenantId || 'Global'}</code> • Current Plan: <span className="font-bold text-amber-400">{tenant?.plan || 'Standard'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Paste Encrypted Base64 Patch Code:
                    </label>
                    <textarea 
                      rows={4}
                      value={pastedCode}
                      onChange={e => setPastedCode(e.target.value)}
                      placeholder="MBI-PATCH-v1:eyJwYXRjaElkIjoicGF0Y2hfMTIz... (Paste developer code here)"
                      className="w-full p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  {validationError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {!previewPatch ? (
                    <button
                      type="button"
                      onClick={handleInspectPatch}
                      disabled={!pastedCode.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
                    >
                      Verify &amp; Inspect Code
                    </button>
                  ) : (
                    <div className="p-4 bg-slate-950 rounded-2xl border border-indigo-500/30 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div>
                          <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-800">
                            VALIDATED SIGNATURE
                          </span>
                          <h4 className="text-sm font-black text-white mt-1">{previewPatch.title}</h4>
                          <p className="text-xs text-slate-400">{previewPatch.description}</p>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div>ID: <code className="text-indigo-300">{previewPatch.patchId}</code></div>
                          <div>Target: <code>{previewPatch.targetTenantId}</code></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-white/5 space-y-1">
                          <span className="font-bold text-slate-300 text-[11px]">Features to Unlock:</span>
                          <div className="flex flex-wrap gap-1">
                            {previewPatch.features.map(f => (
                              <span key={f} className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-white/5 space-y-1">
                          <span className="font-bold text-slate-300 text-[11px]">Routes to Permit:</span>
                          <div className="flex flex-wrap gap-1">
                            {previewPatch.routes.map(r => (
                              <span key={r} className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono">
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {previewPatch.limitsExpansion && (
                        <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs">
                          <strong>Limits Expanded:</strong>{' '}
                          {previewPatch.limitsExpansion.maxGodowns && `Godowns: ${previewPatch.limitsExpansion.maxGodowns} `}
                          {previewPatch.limitsExpansion.maxStaffUsers && `Staff: ${previewPatch.limitsExpansion.maxStaffUsers} `}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewPatch(null)}
                          className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 text-xs hover:bg-white/5 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyPatch}
                          disabled={isApplying}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isApplying ? 'Applying...' : 'Authorize &amp; Install Patch'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INSTALLED PATCHES */}
              {activeTab === 'installed' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Active Feature Patches on this Device</h3>
                    <span className="text-xs text-slate-400">{installedPatches.length} Installed</span>
                  </div>

                  {installedPatches.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
                      <Cpu className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-semibold text-slate-400">No custom patches installed on this machine.</p>
                    </div>
                  ) : (
                    installedPatches.map(p => (
                      <div key={p.patchId} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{p.title}</h4>
                            <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase border ${
                              p.status === 'ACTIVE' 
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{p.description}</p>
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            {p.features.map(f => (
                              <span key={f} className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePatch(p.patchId)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                            title={p.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePatch(p.patchId, p.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: DEVELOPER GENERATOR */}
              {activeTab === 'generator' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Developer Feature Patch Generator</span>
                      </h3>
                      <p className="text-xs text-slate-400">Generate cryptographic unlock codes to send to clients via WhatsApp</p>
                    </div>
                  </div>

                  {/* Preset Templates */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Quick Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => handlePresetSelect('GODOWNS')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer"
                      >
                        + Godowns
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handlePresetSelect('NARCOTICS')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer"
                      >
                        + Form 7 Narcotics
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handlePresetSelect('ONLINE_STORE')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer"
                      >
                        + Online Storefront
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handlePresetSelect('AUDIT_TRAIL')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer"
                      >
                        + Audit Trail
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handlePresetSelect('EXTRA_USERS')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer"
                      >
                        + 10 Cashier Logins
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Patch Title</label>
                      <input 
                        type="text" 
                        value={genTitle} 
                        onChange={e => setGenTitle(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Target Tenant ID (* for any)</label>
                      <input 
                        type="text" 
                        value={genTargetTid} 
                        onChange={e => setGenTargetTid(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-semibold mb-1">Features (comma separated)</label>
                      <input 
                        type="text" 
                        value={genFeatures} 
                        onChange={e => setGenFeatures(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Generate Patch Code
                  </button>

                  {generatedOutput && (
                    <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400">Generated Encrypted Code:</span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          {copiedCode ? 'Copied!' : 'Copy Code'}
                        </button>
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

              {/* TAB 4: DATABASE & SERVER STATUS */}
              {activeTab === 'database' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-400" />
                        <span>Central Database Architecture</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Node.js Express REST API &amp; multi-tenant database engine
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyDbInfo}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedDbInfo ? 'Copied!' : 'Copy Architecture Info'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Database Engine:</span>
                      <span className="text-emerald-400 font-bold">PostgreSQL / MySQL Multi-Tenant</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">API Gateway:</span>
                      <span className="text-white font-bold">Node.js Express (/api/auth, /api/tenant)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Authentication:</span>
                      <span className="text-indigo-300 font-bold">JWT Signed Sessions</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">FEFO Engine:</span>
                      <span className="text-emerald-400 font-bold">Composite B-Tree Indexes</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">External Dependencies:</span>
                      <span className="text-slate-200">Zero Cloud Vendor Lock-in (100% Native)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
