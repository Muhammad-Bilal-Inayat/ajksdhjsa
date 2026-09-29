import React, { useState } from 'react';
import { 
  Sliders, ShieldCheck, ShieldAlert, Check, 
  Package, DollarSign, Stethoscope, Truck, 
  BookOpen, ShoppingBag, Landmark, Sparkles,
  Lock, Save, RefreshCw, Layers, CheckCircle2
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { isPrimaryOwner } from '../../services/rbacService';
import { emitToast } from '../../contexts/ToastContext';

export const MenuCustomizerSettings: React.FC = () => {
  const { settings, updateSettings, userPreferences, updateUserPreferences } = useSettings();
  const { activeUser, currentUser, activeRole } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // RBAC Check: Only Primary Owner can access menu customizer
  const isOwner = isPrimaryOwner(activeUser || currentUser) || String(activeRole).toLowerCase() === 'owner' || String(activeRole).toLowerCase() === 'admin';

  if (!isOwner) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900 shadow-sm space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
            403 Access Denied
          </span>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
            Primary Store Owner Protected
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Navigation and sidebar menu customization is restricted strictly to the Primary Pharmacy Owner. Sub-user terminals follow store-level navigation policies.
          </p>
        </div>
      </div>
    );
  }

  // Active module states
  const modules = settings.modules || {
    sales: true,
    purchases: true,
    inventory: true,
    parties: true,
    expenses: true,
    banking: true,
    reports: true,
    pos: true,
    syncShare: true
  };

  const visibilityMap = userPreferences?.menuVisibility || {};

  const handleToggleModule = (key: string, currentValue: boolean) => {
    // 1. Update module settings in context & storage
    if (key in modules) {
      updateSettings({
        modules: {
          ...modules,
          [key]: !currentValue
        }
      });
    }

    // 2. Also update granular menuVisibility in userPreferences
    updateUserPreferences({
      menuVisibility: {
        ...visibilityMap,
        [key]: !currentValue
      }
    });

    emitToast(`Navigation menu updated: ${key} is now ${!currentValue ? 'Visible' : 'Hidden'}`, 'success');
  };

  const menuItems = [
    {
      id: 'items',
      moduleKey: 'inventory',
      label: 'Items & Medicine Catalog',
      icon: Package,
      description: 'Medicine formulations, generic salt alternates, stock lots & barcode tags',
      enabled: modules.inventory !== false && visibilityMap['items'] !== false
    },
    {
      id: 'expenses',
      moduleKey: 'expenses',
      label: 'Expenses Register & Petty Cash',
      icon: DollarSign,
      description: 'Daily operational expenses, utility bills, employee tea & rent records',
      enabled: modules.expenses !== false && visibilityMap['expenses'] !== false
    },
    {
      id: 'prescriptions',
      moduleKey: 'prescriptions',
      label: 'Doctor Prescriptions Log',
      icon: Stethoscope,
      description: 'Doctor license numbers, patient script attachments & dosage advice',
      enabled: visibilityMap['prescriptions'] !== false
    },
    {
      id: 'transfers',
      moduleKey: 'transfers',
      label: 'Multi-Branch Stock Transfers',
      icon: Truck,
      description: 'Inter-branch requisitions, central godown gate passes & transit logs',
      enabled: visibilityMap['transfers'] !== false
    },
    {
      id: 'parties',
      moduleKey: 'parties',
      label: 'Customer & Supplier Khatas',
      icon: BookOpen,
      description: 'Double-entry customer credit ledgers, supplier payables & payment receipts',
      enabled: modules.parties !== false && visibilityMap['parties'] !== false
    },
    {
      id: 'onlineStore',
      moduleKey: 'onlineStore',
      label: 'Online E-Commerce Store',
      icon: ShoppingBag,
      description: 'Patient WhatsApp ordering catalog, delivery cart & web promotions',
      enabled: visibilityMap['onlineStore'] !== false
    },
    {
      id: 'bank',
      moduleKey: 'banking',
      label: 'Cash & Bank Accounts',
      icon: Landmark,
      description: 'Cheque registers, bank reconciliations & multi-bank ledger balances',
      enabled: modules.banking !== false && visibilityMap['bank'] !== false
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Navigation &amp; Menu Preferences
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Primary Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Toggle optional modules ON or OFF to keep your counter cashier sidebar lean, clutter-free, and focused.
            </p>
          </div>
        </div>
      </div>

      {/* Toggles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isEnabled = item.enabled;

          return (
            <div
              key={item.id}
              onClick={() => handleToggleModule(item.id, isEnabled)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 select-none ${
                isEnabled
                  ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-xs ring-1 ring-blue-500/10'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isEnabled
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {item.label}
                    </h4>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      isEnabled
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {isEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* iOS Switch Pill */}
              <div className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}>
                <div className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                  {isEnabled && <Check className="w-3 h-3 text-blue-600" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
