import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Sparkles, Plus, Trash2, RotateCcw, Save, 
  CheckCircle2, AlertCircle, Edit3, Shield, Users, Building2, 
  Percent, Check, Eye, EyeOff, Star, HelpCircle, ArrowRight, Tag,
  ListPlus, Sliders, Layers
} from 'lucide-react';
import { 
  SaaSPlanDefinition, 
  DEFAULT_TENANT_FEATURE_TOGGLES 
} from '../../types';
import { 
  getSaaSPlans, 
  saveSaaSPlans, 
  DEFAULT_SAAS_PLANS 
} from '../../lib/planLimitsService';

interface PlanPricingManagerPanelProps {
  onNotify?: (msg: string) => void;
}

export const PlanPricingManagerPanel: React.FC<PlanPricingManagerPanelProps> = ({ onNotify }) => {
  const [plans, setPlans] = useState<SaaSPlanDefinition[]>(() => getSaaSPlans());
  const [editingPlan, setEditingPlan] = useState<SaaSPlanDefinition | null>(null);
  const [coreFeaturesText, setCoreFeaturesText] = useState<string>('');
  const [advancedSpecsText, setAdvancedSpecsText] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setPlans(getSaaSPlans());
  }, []);

  const openEditModal = (plan: SaaSPlanDefinition) => {
    setEditingPlan({ ...plan });
    setCoreFeaturesText((plan.coreFeatures || []).join('\n'));
    setAdvancedSpecsText((plan.advancedSpecs || []).join('\n'));
  };

  const handleSavePlan = (updatedPlan: SaaSPlanDefinition) => {
    const parsedCoreFeatures = coreFeaturesText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const parsedAdvancedSpecs = advancedSpecsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const effectiveMonthly = updatedPlan.effectiveMonthly || Math.round((updatedPlan.pricing.yearly || 0) / 12);

    const finalPlan: SaaSPlanDefinition = {
      ...updatedPlan,
      effectiveMonthly,
      coreFeatures: parsedCoreFeatures.length > 0 ? parsedCoreFeatures : updatedPlan.coreFeatures,
      advancedSpecs: parsedAdvancedSpecs.length > 0 ? parsedAdvancedSpecs : updatedPlan.advancedSpecs,
      updatedAt: new Date().toISOString(),
    };

    const updatedPlans = plans.map(p => p.id === finalPlan.id ? finalPlan : p);
    setPlans(updatedPlans);
    saveSaaSPlans(updatedPlans);
    window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: updatedPlans }));
    setEditingPlan(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
    onNotify?.(`Plan "${finalPlan.name}" rates & features updated successfully!`);
  };

  const handleCreatePlan = (newPlan: SaaSPlanDefinition) => {
    const updatedPlans = [...plans, { ...newPlan, updatedAt: new Date().toISOString() }];
    setPlans(updatedPlans);
    saveSaaSPlans(updatedPlans);
    window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: updatedPlans }));
    setEditingPlan(null);
    onNotify?.(`New plan "${newPlan.name}" created successfully!`);
  };

  const handleDeletePlan = (planId: string) => {
    if (plans.length <= 1) {
      alert('You must maintain at least one active SaaS licensing plan.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this subscription plan tier?')) {
      const updatedPlans = plans.filter(p => p.id !== planId);
      setPlans(updatedPlans);
      saveSaaSPlans(updatedPlans);
      window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: updatedPlans }));
      onNotify?.('Plan tier deleted successfully.');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all SaaS plans, rates, and features back to official 17-point matrix defaults?')) {
      setPlans(DEFAULT_SAAS_PLANS);
      saveSaaSPlans(DEFAULT_SAAS_PLANS);
      window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: DEFAULT_SAAS_PLANS }));
      onNotify?.('Reset all plans to factory default pricing and features.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 p-6 rounded-3xl shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-bold tracking-wide uppercase mb-2">
            <CreditCard className="w-3.5 h-3.5" /> Server SaaS License &amp; Pricing Manager
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Plans, Pricing &amp; Features Engine</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Centrally configure pharmacy software subscription tiers, manual recurring rates in PKR (Monthly, 1-Year, 3-Years, 5-Years), discount rules, core feature bullet points, and quota limits. Changes synchronize instantly across Home, User Licensing, and Server Hub.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              const newBlankPlan: SaaSPlanDefinition = {
                id: `Custom_${Date.now()}`,
                name: 'Custom Special Plan',
                badge: '✨ Custom Special',
                tagline: 'Customized pharmacy license with selected modules.',
                description: 'Tailored plan package for specific pharmacy client configurations.',
                pricing: {
                  monthly: 1999,
                  yearly: 19990,
                  threeYears: 44990,
                  fiveYears: 69990,
                },
                effectiveMonthly: 1666,
                trialDurationDays: 3,
                maxFirms: 3,
                maxUsers: 8,
                allowedRoles: ['Primary Admin', 'Cashier', 'Manager'],
                features: { ...DEFAULT_TENANT_FEATURE_TOGGLES },
                coreFeatures: [
                  'Up to 8 Staff Accounts',
                  'Up to 3 Pharmacy Branches',
                  'POS Billing & Thermal Printing',
                  'Offline-First Local Engine'
                ],
                advancedSpecs: [
                  'Standard Technical Support'
                ],
                isPopular: false,
                isVisible: true,
                order: plans.length + 1,
                notes: 'Custom configured server plan.',
                updatedAt: new Date().toISOString(),
              };
              openEditModal(newBlankPlan);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Plan</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset to factory default plans"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>SaaS Plan rates, quotas &amp; features updated! Changes are live across Home, User Licensing, and Server Hub.</span>
        </div>
      )}

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`bg-slate-900/90 border rounded-3xl p-6 shadow-xl flex flex-col justify-between relative transition-all ${
              plan.isPopular 
                ? 'border-indigo-500 ring-2 ring-indigo-500/30' 
                : plan.isVip
                ? 'border-purple-500 ring-2 ring-purple-500/30'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                ⭐ Most Popular
              </div>
            )}

            {plan.isVip && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                💎 Best Enterprise Value
              </div>
            )}

            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-indigo-400 block">{plan.badge}</span>
                  <h3 className="text-xl font-black text-white">{plan.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const updated = plans.map(p => p.id === plan.id ? { ...p, isVisible: !p.isVisible } : p);
                      setPlans(updated);
                      saveSaaSPlans(updated);
                      window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: updated }));
                    }}
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                      plan.isVisible 
                        ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700' 
                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                    }`}
                    title={plan.isVisible ? 'Plan is Visible on Customer Portal' : 'Plan is Hidden from Customer Portal'}
                  >
                    {plan.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => openEditModal(plan)}
                    className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs cursor-pointer transition-colors"
                    title="Edit Plan Pricing & Details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg text-xs cursor-pointer transition-colors"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 min-h-[36px]">{plan.tagline}</p>

              {/* Price Matrix */}
              <div className="bg-slate-950/70 border border-slate-800/90 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Monthly:</span>
                  <span className="font-mono font-bold text-white">
                    {plan.pricing.monthly === 0 ? <span className="text-emerald-400 font-black">Free (Rs. 0)</span> : `PKR ${(plan.pricing.monthly || 0).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-1.5">
                  <span className="text-slate-300 font-bold flex items-center gap-1">
                    <span>1 Year:</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded">
                      {plan.savings?.['1year'] || 'Save ~17%'}
                    </span>
                  </span>
                  <span className="font-mono font-black text-emerald-400">
                    {plan.pricing.yearly === 0 ? 'Free (Rs. 0)' : `PKR ${(plan.pricing.yearly || 0).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-1.5">
                  <span className="text-slate-400 font-medium">Effective Monthly:</span>
                  <span className="font-mono font-semibold text-emerald-300 text-[11px]">
                    ≈ Rs. {(plan.effectiveMonthly || Math.round((plan.pricing.yearly || 0) / 12)).toLocaleString()}/mo
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-1.5">
                  <span className="text-slate-400 font-medium">3 Years:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {plan.pricing.threeYears === 0 ? 'Free (Rs. 0)' : `PKR ${(plan.pricing.threeYears || 0).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-1.5">
                  <span className="text-slate-400 font-medium">5 Years:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {plan.pricing.fiveYears === 0 ? 'Free (Rs. 0)' : `PKR ${(plan.pricing.fiveYears || 0).toLocaleString()}`}
                  </span>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-800/60 border border-slate-700/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold">Max Users</span>
                  <span className="font-mono font-black text-indigo-300">{plan.maxUsers} Accounts</span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold">Max Branches</span>
                  <span className="font-mono font-black text-cyan-300">{plan.maxFirms} Firms</span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold">Trial Length</span>
                  <span className="font-mono font-black text-amber-300">{plan.trialDurationDays || 3} Days</span>
                </div>
              </div>

              {/* Feature Highlights Count */}
              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Core Feature Bullets:</span>
                  <span className="font-bold text-emerald-400">{plan.coreFeatures?.length || 0} items</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Advanced Specs:</span>
                  <span className="font-bold text-indigo-400">{plan.advancedSpecs?.length || 0} items</span>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div className="pt-5 mt-4 border-t border-slate-800">
              <button
                onClick={() => openEditModal(plan)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Edit Pricing, Rates &amp; Features</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT / CREATE PLAN MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-white max-h-[92vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Edit Subscription Plan</h3>
                  <p className="text-xs text-slate-400">Configure manual pricing in PKR, quotas, and feature bullet points</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Plan Title &amp; Emoji</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. 🥇 Gold Business ⭐"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Badge Label</label>
                <input
                  type="text"
                  value={editingPlan.badge}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, badge: e.target.value } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Business"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Tagline (Short Summary)</label>
                <input
                  type="text"
                  value={editingPlan.tagline}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, tagline: e.target.value } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Comprehensive multi-godown, batch & FEFO expiry radar, multi-pricing & profit analysis."
                />
              </div>

              {/* Pricing Rates Grid */}
              <div className="sm:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Manual Pricing in PKR (Pakistani Rupees)
                  </h4>
                  <span className="text-[11px] text-slate-400">Syncs live to customer portal</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-semibold">Monthly (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingPlan.pricing.monthly}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                        setEditingPlan(prev => prev ? {
                          ...prev,
                          pricing: { ...prev.pricing, monthly: val }
                        } : null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-emerald-400 font-bold">1 Year / Annual (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingPlan.pricing.yearly}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                        const eff = Math.round(val / 12);
                        setEditingPlan(prev => prev ? {
                          ...prev,
                          effectiveMonthly: eff,
                          pricing: { ...prev.pricing, yearly: val }
                        } : null);
                      }}
                      className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-semibold">3 Years (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingPlan.pricing.threeYears}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                        setEditingPlan(prev => prev ? {
                          ...prev,
                          pricing: { ...prev.pricing, threeYears: val }
                        } : null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-semibold">5 Years (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingPlan.pricing.fiveYears}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                        setEditingPlan(prev => prev ? {
                          ...prev,
                          pricing: { ...prev.pricing, fiveYears: val }
                        } : null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-semibold">Effective Monthly Rate (PKR / mo)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingPlan.effectiveMonthly || Math.round((editingPlan.pricing.yearly || 0) / 12)}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                        setEditingPlan(prev => prev ? { ...prev, effectiveMonthly: val } : null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-semibold">Annual Savings Badge Text</label>
                    <input
                      type="text"
                      value={editingPlan.savings?.['1year'] || 'Save ~17% (Annual Deal)'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingPlan(prev => prev ? {
                          ...prev,
                          savings: { ...prev.savings, '1year': val }
                        } : null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Quota Limits */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Max Team Users (Accounts)</label>
                <input
                  type="number"
                  value={editingPlan.maxUsers}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, maxUsers: Number(e.target.value) } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Max Firms / Branches</label>
                <input
                  type="number"
                  value={editingPlan.maxFirms}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, maxFirms: Number(e.target.value) } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Trial Period (Days)</label>
                <input
                  type="number"
                  value={editingPlan.trialDurationDays || 3}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, trialDurationDays: Number(e.target.value) } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.isPopular}
                    onChange={(e) => setEditingPlan(prev => prev ? { ...prev, isPopular: e.target.checked } : null)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-300">Mark as Most Popular</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.isVip}
                    onChange={(e) => setEditingPlan(prev => prev ? { ...prev, isVip: e.target.checked } : null)}
                    className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-950 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-300">Mark as Best Enterprise Value</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.isVisible}
                    onChange={(e) => setEditingPlan(prev => prev ? { ...prev, isVisible: e.target.checked } : null)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-300">Visible on Portal</span>
                </label>
              </div>

              {/* MANUAL CORE FEATURES LIST */}
              <div className="sm:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListPlus className="w-3.5 h-3.5" /> Core Features Included (One Per Line)
                  </label>
                  <span className="text-[11px] text-slate-400">Shown directly on primary card</span>
                </div>
                <textarea
                  rows={6}
                  value={coreFeaturesText}
                  onChange={(e) => setCoreFeaturesText(e.target.value)}
                  placeholder="Enter each core feature on a new line..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              {/* MANUAL ADVANCED SPECS & CAPABILITIES LIST */}
              <div className="sm:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Advanced Specifications &amp; Capabilities (One Per Line)
                  </label>
                  <span className="text-[11px] text-slate-400">Shown under "Show Extra Details" dropdown</span>
                </div>
                <textarea
                  rows={6}
                  value={advancedSpecsText}
                  onChange={(e) => setAdvancedSpecsText(e.target.value)}
                  placeholder="Enter each advanced specification on a new line..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>

              {/* Module Toggles */}
              <div className="sm:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Backend Feature Module Toggles
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.keys(editingPlan.features).map((featKey) => (
                    <label key={featKey} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={(editingPlan.features as any)[featKey]}
                        onChange={(e) => setEditingPlan(prev => prev ? {
                          ...prev,
                          features: {
                            ...prev.features,
                            [featKey]: e.target.checked
                          }
                        } : null)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 w-3.5 h-3.5"
                      />
                      <span className="capitalize">{featKey.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePlan(editingPlan)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Plan &amp; Synchronize</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
