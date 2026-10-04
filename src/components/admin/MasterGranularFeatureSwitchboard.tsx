import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sliders, Search, Sparkles, CheckCircle, Ban, 
  ShieldCheck, Check, Save, RotateCcw, Building2, 
  Layers, Zap, AlertTriangle, Filter, Lock, Unlock,
  Activity, Eye, Radio, ShieldAlert, Award, Crown, CheckCircle2
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

  // Load Tenants & filter ONLY registered company owners / tenants
  useEffect(() => {
    adminService.getTenantsTelemetry().then((list) => {
      // 1. Filter: Company Owners Only (Strictly exclude cashiers and staff sub-users)
      const ownersOnly = (list || []).filter((t: any) => {
        if (!t || !t.id) return false;
        const role = String(t.role || '').toLowerCase();
        if (role === 'cashier' || role === 'staff' || role === 'accountant' || role === 'biller') {
          return false;
        }
        return true;
      });
      setTenants(ownersOnly);
    }).catch(console.error);
  }, []);

  // Selected company object
  const activeCompany = useMemo(() => {
    if (selectedTenantId === 'GLOBAL') return null;
    return tenants.find((item) => item.id === selectedTenantId || item.tenantId === selectedTenantId) || null;
  }, [selectedTenantId, tenants]);

  // When selected tenant changes, load their feature set
  useEffect(() => {
    if (selectedTenantId === 'GLOBAL') {
      setFeatureMap(getDefaultFeatureMap());
    } else {
      const t = tenants.find((item) => item.id === selectedTenantId || item.tenantId === selectedTenantId);
      if (t && t.features && Object.keys(t.features).length > 0) {
        setFeatureMap({ ...getDefaultFeatureMap(), ...t.features });
      } else {
        setFeatureMap(getDefaultFeatureMap());
      }
    }
  }, [selectedTenantId, tenants]);

  // Toggle single feature (100% Custom Feature & Permission Access)
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
    emitToast('Enabled all features in current filter view', 'success');
  };

  const handleDisableAllInView = () => {
    const updated = { ...featureMap };
    filteredFeatures.forEach((f) => {
      updated[f.id] = false;
    });
    setFeatureMap(updated);
    emitToast('Disabled all features in current filter view', 'info');
  };

  // Reset to default
  const handleResetDefaults = () => {
    setFeatureMap(getDefaultFeatureMap());
    emitToast('Reset all switchboard features to standard defaults', 'info');
  };

  // Save changes Live to MariaDB & broadcast instant sync
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (selectedTenantId === 'GLOBAL') {
        // Broadcast to all company owners
        for (const t of tenants) {
          await adminService.saveTenantFeatures(t.id, featureMap);
        }
        emitToast('Global Master Feature Switchboard deployed live to all pharmacies!', 'success');
      } else {
        await adminService.saveTenantFeatures(selectedTenantId, featureMap);
        const tName = activeCompany?.name || 'Company Owner';
        emitToast(`Live features & overrides deployed successfully for ${tName}! ✨`, 'success');
      }
    } catch (e: any) {
      emitToast(e?.message || 'Failed to save feature switchboard matrix', 'error');
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

  // Dynamic Plan Badge calculation
  const planBadgeInfo = useMemo(() => {
    if (!activeCompany) {
      return {
        label: 'Global Network Policy (All Companies)',
        colorClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
      };
    }

    const rawPlan = (activeCompany.plan || activeCompany.planId || 'Gold').toUpperCase();
    const expiry = activeCompany.trialExpiryDate || 'Active';
    const isEnterprise = rawPlan.includes('PLATINUM') || rawPlan.includes('ENTERPRISE');
    const isGold = rawPlan.includes('GOLD') || rawPlan.includes('BUSINESS');

    if (isEnterprise) {
      return {
        label: `👑 Platinum Enterprise • Valid: ${expiry}`,
        colorClass: 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10'
      };
    }
    if (isGold) {
      return {
        label: `✨ Gold Business • Valid: ${expiry}`,
        colorClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
      };
    }
    return {
      label: `🛡️ Silver Basic • Valid: ${expiry}`,
      colorClass: 'bg-slate-500/15 text-slate-300 border-slate-500/40'
    };
  }, [activeCompany]);

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
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                {totalFeaturesCount} Controls & Overrides
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Custom feature allocation & security overrides with instant zero-restart SQLite Vault sync to live POS terminals.
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
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Deploying Live...' : 'Save Live ✨'}</span>
          </button>
        </div>
      </div>

      {/* Target Company Owner Selector & Dynamic Plan Badge Bar */}
      <div className={`p-4 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300 shrink-0">Company Owner:</span>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold outline-none cursor-pointer ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
            }`}
          >
            <option value="GLOBAL">🌐 ALL PHARMACY OWNERS (Global Master Policy)</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                🏢 {t.name} • {t.ownerName || 'Owner'} ({t.city || 'Pakistan'})
              </option>
            ))}
          </select>

          {/* Dynamic Active Plan Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-extrabold ${planBadgeInfo.colorClass}`}>
            <span>{planBadgeInfo.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Active: <strong className="text-emerald-400">{enabledCount} Active</strong> / {totalFeaturesCount} Controls</span>
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
            placeholder="Search 173 features & overrides (e.g. Invoice Edit, Bill Deletion, Discounts, FEFO, WhatsApp)..."
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
            All Controls ({totalFeaturesCount})
          </button>
          {DEFAULT_173_FEATURE_MATRIX.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? cat.id === 'critical_overrides' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' : 'bg-blue-600 text-white shadow-md'
                  : isDarkMode 
                    ? cat.id === 'critical_overrides' ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/60' : 'bg-slate-900 text-slate-400 hover:text-white' 
                    : cat.id === 'critical_overrides' ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {cat.id === 'critical_overrides' ? '🚨 ' : ''}{cat.name} ({cat.features.length})
            </button>
          ))}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredFeatures.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-400">
            No features or overrides found matching your search.
          </div>
        ) : (
          filteredFeatures.map((feat) => {
            const isEnabled = Boolean(featureMap[feat.id]);
            const isCritical = feat.category === 'critical_overrides';

            return (
              <div
                key={feat.id}
                onClick={() => handleToggle(feat.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                  isCritical
                    ? isEnabled
                      ? isDarkMode
                        ? 'bg-rose-600/15 border-rose-500/50 hover:bg-rose-600/20 shadow-sm shadow-rose-500/10'
                        : 'bg-rose-50 border-rose-300 hover:bg-rose-100/70'
                      : isDarkMode
                      ? 'bg-slate-900/40 border-rose-950/40 opacity-70 hover:opacity-100'
                      : 'bg-white border-slate-200 opacity-75 hover:opacity-100 shadow-sm'
                    : isEnabled
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
                    <span className={`text-xs font-bold leading-tight ${isCritical ? 'text-rose-300' : 'text-slate-100'}`}>
                      {feat.name}
                    </span>
                    {feat.badge && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                        isCritical 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {feat.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {feat.description}
                  </p>
                  <div className="text-[9px] font-mono text-slate-500 mt-1.5 uppercase flex items-center gap-2">
                    <span>ID: {feat.id}</span>
                    {isCritical && <span className="text-rose-400 font-bold">• HIGH-RISK OVERRIDE</span>}
                  </div>
                </div>

                {/* Switch Toggle */}
                <div className="shrink-0 mt-0.5">
                  <div className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    isEnabled 
                      ? isCritical ? 'bg-rose-600 justify-end' : 'bg-emerald-600 justify-end' 
                      : 'bg-slate-700 justify-start'
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

