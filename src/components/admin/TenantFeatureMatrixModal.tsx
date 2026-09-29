import React, { useState } from 'react';
import { 
  X, Sliders, Search, Zap, Check, RotateCcw, Building2, 
  Sparkles, Crown, Shield, Layers, HelpCircle, CheckCircle2, 
  AlertCircle, DollarSign, Package, Lock, Unlock
} from 'lucide-react';
import { DEFAULT_173_FEATURE_MATRIX, TenantFeatureMap, getDefaultFeatureMap, getFeaturesForPlan } from '../../types/features';
import { TenantTelemetryRecord, adminService } from '../../services/adminService';
import { emitToast } from '../../contexts/ToastContext';

interface TenantFeatureMatrixModalProps {
  tenant: TenantTelemetryRecord;
  isOpen: boolean;
  onClose: () => void;
  onFeaturesSaved?: (features: TenantFeatureMap) => void;
}

export const TenantFeatureMatrixModal: React.FC<TenantFeatureMatrixModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onFeaturesSaved
}) => {
  const [editingFeatures, setEditingFeatures] = useState<TenantFeatureMap>(() => tenant.features || getFeaturesForPlan(tenant.plan || 'basic'));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setEditingFeatures(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleEnableAll = () => {
    const fullMap: TenantFeatureMap = {};
    for (const cat of DEFAULT_173_FEATURE_MATRIX) {
      for (const f of cat.features) fullMap[f.id] = true;
    }
    setEditingFeatures(fullMap);
    emitToast('All 173 enterprise modules unlocked for editing', 'info');
  };

  const handleResetDefaults = () => {
    setEditingFeatures(getFeaturesForPlan(tenant.plan || 'basic'));
    emitToast(`Reset to default features for ${tenant.plan || 'Basic'} plan`, 'info');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ok = await adminService.updateTenantFeatures(tenant.id, editingFeatures);
      if (ok) {
        emitToast(`✅ 173-Feature matrix updated & broadcasted via SSE to ${tenant.name}`, 'success');
        onFeaturesSaved?.(editingFeatures);
        onClose();
      } else {
        emitToast('Failed to broadcast features to store', 'error');
      }
    } catch (e: any) {
      emitToast(e?.message || 'Save failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = Object.values(editingFeatures).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <aside className="w-full sm:w-[680px] h-screen bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* HEADER: COMPANY / PHARMACY LEVEL SWITCHBOARD */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                  Tenant 173 Feature Switchboard
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Tenant-Level (All Staff)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Store: <strong className="text-slate-800 dark:text-slate-200">{tenant.name}</strong> ({tenant.city})</span>
                <span>•</span>
                <span>Plan: <strong className="text-indigo-600 dark:text-indigo-400">{tenant.plan || 'Standard'}</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ADD-ON MONETIZATION BANNER */}
        <div className="px-5 py-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Toggle any module ON as a <strong>custom paid add-on</strong> for this pharmacy. Broadcasts instantly via SSE (&lt;100ms).
            </span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
            {activeCount} / 173 Active
          </div>
        </div>

        {/* QUICK TOOLBAR & ACTIONS */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEnableAll}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 font-bold cursor-pointer transition-colors"
            >
              Enable All (173)
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Plan Defaults</span>
            </button>
          </div>

          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search 173 features..."
              className="w-full pl-7 pr-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>
        </div>

        {/* CATEGORIES CHIP STRIP */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto flex items-center gap-1.5 shrink-0 text-[11px] custom-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Categories ({DEFAULT_173_FEATURE_MATRIX.length})
          </button>
          {DEFAULT_173_FEATURE_MATRIX.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* FEATURES MATRIX LIST */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-6">
          {DEFAULT_173_FEATURE_MATRIX.map((cat) => {
            if (selectedCategory !== 'all' && selectedCategory !== cat.id) return null;

            const visibleFeatures = cat.features.filter(f => 
              !searchQuery.trim() || 
              f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              f.description.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (visibleFeatures.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                      {cat.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{cat.description}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    {visibleFeatures.filter(f => editingFeatures[f.id]).length} / {visibleFeatures.length} On
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {visibleFeatures.map(feat => {
                    const isEnabled = Boolean(editingFeatures[feat.id]);

                    return (
                      <div
                        key={feat.id}
                        onClick={() => handleToggle(feat.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isEnabled
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/80 shadow-2xs'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {feat.name}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-extrabold uppercase border ${
                              feat.minPlan === 'enterprise'
                                ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                : feat.minPlan === 'business'
                                ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            }`}>
                              {feat.minPlan === 'enterprise' ? 'Enterprise' : feat.minPlan === 'business' ? 'Business' : 'Basic'}
                            </span>
                            {feat.badge && (
                              <span className="px-1.5 py-0.2 rounded-sm text-[8px] font-black uppercase bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {feat.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {feat.description}
                          </p>
                        </div>

                        {/* Switch Pill */}
                        <div className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                          isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                        }`}>
                          <div className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                            {isEnabled ? (
                              <Check className="w-3 h-3 text-blue-600" />
                            ) : (
                              <X className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER SAVE BAR */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Broadcasting to <strong className="text-slate-900 dark:text-white">{tenant.name}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>{isSaving ? 'Broadcasting SSE...' : `Save & Broadcast (${activeCount} Active)`}</span>
            </button>
          </div>
        </div>

      </aside>
    </div>
  );
};

export default TenantFeatureMatrixModal;
