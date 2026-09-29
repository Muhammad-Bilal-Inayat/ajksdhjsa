import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sliders, Search, Sparkles, CheckCircle, Ban, 
  ShieldCheck, Check, Save, RotateCcw, Building2, 
  Layers, Zap, AlertTriangle, Filter, Lock, Unlock,
  Activity, Eye, Radio
} from 'lucide-react';
import { DEFAULT_173_FEATURE_MATRIX, TenantFeatureMap, getDefaultFeatureMap, FeatureItem } from '../../types/features';
import { adminService, TenantTelemetryRecord } from '../../services/adminService';
import { emitToast } from '../../contexts/ToastContext';

export const MasterGranularFeatureSwitchboard: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [tenants, setTenants] = useState<TenantTelemetryRecord[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('GLOBAL');
  const [featureMap, setFeatureMap] = useState<TenantFeatureMap>(() => getDefaultFeatureMap());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState(false);

  // Load Tenants
  useEffect(() => {
    adminService.getTenantsTelemetry().then((list) => {
      setTenants(list);
    }).catch(console.error);
  }, []);

  // When selected tenant changes, load their feature set
  useEffect(() => {
    if (selectedTenantId === 'GLOBAL') {
      setFeatureMap(getDefaultFeatureMap());
    } else {
      const t = tenants.find((item) => item.id === selectedTenantId);
      if (t && t.features && Object.keys(t.features).length > 0) {
        setFeatureMap({ ...getDefaultFeatureMap(), ...t.features });
      } else {
        setFeatureMap(getDefaultFeatureMap());
      }
    }
  }, [selectedTenantId, tenants]);

  // Toggle single feature
  const handleToggle = (featureId: string) => {
    setFeatureMap((prev) => ({
      ...prev,
      [featureId]: !prev[featureId]
    }));
  };

  // Batch Enable / Disable All in current view
  const handleEnableAllInView = () => {
    const updated = { ...featureMap };
    filteredFeatures.forEach((f) => {
      updated[f.id] = true;
    });
    setFeatureMap(updated);
    emitToast('Enabled all features in current filter', 'success');
  };

  const handleDisableAllInView = () => {
    const updated = { ...featureMap };
    filteredFeatures.forEach((f) => {
      updated[f.id] = false;
    });
    setFeatureMap(updated);
    emitToast('Disabled all features in current filter', 'info');
  };

  // Reset to default
  const handleResetDefaults = () => {
    setFeatureMap(getDefaultFeatureMap());
    emitToast('Reset all features to standard defaults', 'info');
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (selectedTenantId === 'GLOBAL') {
        // Broadcast to all tenants
        for (const t of tenants) {
          await adminService.saveTenantFeatures(t.id, featureMap);
        }
        emitToast('Global Feature Switchboard updated for all pharmacies!', 'success');
      } else {
        await adminService.saveTenantFeatures(selectedTenantId, featureMap);
        const tName = tenants.find((t) => t.id === selectedTenantId)?.name || 'Pharmacy';
        emitToast(`Updated feature switchboard for ${tName}!`, 'success');
      }
    } catch (e) {
      emitToast('Failed to save feature switchboard', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Collect all features flat
  const allFeatures = useMemo(() => {
    const list: FeatureItem[] = [];
    DEFAULT_173_FEATURE_MATRIX.forEach((cat) => {
      cat.features.forEach((feat) => {
        list.push(feat);
      });
    });
    return list;
  }, []);

  // Filtered features
  const filteredFeatures = useMemo(() => {
    return allFeatures.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'ALL' || f.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [allFeatures, searchQuery, selectedCategory]);

  const enabledCount = Object.values(featureMap).filter(Boolean).length;
  const totalFeaturesCount = allFeatures.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>Master Granular Feature Switchboard</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                {totalFeaturesCount} Controls (23 Widgets + 150+ Features)
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live instant toggles with zero-restart remote sync to all client browsers & POS terminals.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Deploying Changes...' : 'Save & Sync Remote'}</span>
          </button>
        </div>
      </div>

      {/* Target Tenant Selector Bar */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-slate-300">Target Switchboard Scope:</span>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold outline-none cursor-pointer ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
            }`}
          >
            <option value="GLOBAL">🌐 ALL PHARMACIES (Global Master Override)</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                🏢 {t.name} ({t.city || 'Pakistan'})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Active Status: <strong className="text-emerald-400">{enabledCount} Active</strong> / {totalFeaturesCount} Total</span>
          <span className="text-slate-600">|</span>
          <button
            onClick={handleEnableAllInView}
            className="text-[11px] font-bold text-blue-400 hover:underline cursor-pointer"
          >
            Enable All Filtered
          </button>
          <button
            onClick={handleDisableAllInView}
            className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
          >
            Disable All Filtered
          </button>
        </div>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features (e.g. FEFO, 0.2s Billing, WhatsApp, Widget)..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium outline-none ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-md'
                : isDarkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            All Features ({totalFeaturesCount})
          </button>
          {DEFAULT_173_FEATURE_MATRIX.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : isDarkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {cat.name} ({cat.features.length})
            </button>
          ))}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredFeatures.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-400">
            No features found matching your search.
          </div>
        ) : (
          filteredFeatures.map((feat) => {
            const isEnabled = Boolean(featureMap[feat.id]);
            return (
              <div
                key={feat.id}
                onClick={() => handleToggle(feat.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                  isEnabled
                    ? isDarkMode
                      ? 'bg-blue-600/10 border-blue-500/40 hover:bg-blue-600/15'
                      : 'bg-blue-50 border-blue-200 hover:bg-blue-100/70'
                    : isDarkMode
                    ? 'bg-slate-900/40 border-slate-800 opacity-60 hover:opacity-100'
                    : 'bg-white border-slate-200 opacity-70 hover:opacity-100 shadow-sm'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold leading-tight text-slate-100">
                      {feat.name}
                    </span>
                    {feat.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                        {feat.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {feat.description}
                  </p>
                  <div className="text-[9px] font-mono text-slate-500 mt-1.5 uppercase">
                    ID: {feat.id}
                  </div>
                </div>

                {/* Switch Toggle */}
                <div className="shrink-0 mt-0.5">
                  <div className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}>
                    <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
