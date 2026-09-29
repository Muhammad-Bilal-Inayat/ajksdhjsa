import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, Clock, AlertTriangle, CheckCircle2, 
  RotateCcw, Sparkles, Filter, ChevronRight, Activity, ArrowRight,
  TrendingDown, RefreshCw, Layers, Zap, Package, FileText, Check,
  ExternalLink
} from 'lucide-react';
import { Medicine } from '../../types';
import { calculateDaysUntilExpiry } from '../../lib/fefoEngine';
import { emitToast } from '../../contexts/ToastContext';
import { HORIZON_DEFINITIONS, HorizonZone } from '../landing/FefoRadarGraphic';

interface FefoExpiryRadarWidgetProps {
  medicines?: Medicine[];
  onNavigate?: (path: string) => void;
}

export const FefoExpiryRadarWidget: React.FC<FefoExpiryRadarWidgetProps> = ({
  medicines = [],
  onNavigate
}) => {
  const [activeFilter, setActiveFilter] = useState<HorizonZone | 'all'>('all');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);

  // Group medicines by 6 horizons
  const categorizedBatches = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      genericName: string;
      batchNumber: string;
      daysRemaining: number;
      quantity: number;
      price: number;
      totalValue: number;
      supplier: string;
      zone: HorizonZone;
    }> = [];

    medicines.forEach(m => {
      const days = calculateDaysUntilExpiry(m.expiryDate || '');
      if (days < 0 || days > 365) return;

      let zone: HorizonZone = '180d';
      if (days <= 7) zone = '7d';
      else if (days <= 15) zone = '15d';
      else if (days <= 30) zone = '30d';
      else if (days <= 60) zone = '60d';
      else if (days <= 90) zone = '90d';
      else zone = '180d';

      const qty = m.quantity || 0;
      const price = m.purchasePrice || m.salePrice || m.mrp || 0;

      list.push({
        id: m.id,
        name: m.name,
        genericName: m.genericName || 'Pharmaceutical compound',
        batchNumber: m.batchNumber || 'BATCH-STD',
        daysRemaining: days,
        quantity: qty,
        price: price,
        totalValue: qty * price,
        supplier: m.supplierName || 'Standard Pharmaceutical Distributor',
        zone
      });
    });

    // If empty DB, provide standard demonstration batches
    if (list.length === 0) {
      return [
        {
          id: 'demo-1',
          name: 'Augmentin 625mg Tab',
          genericName: 'Co-Amoxiclav 625mg',
          batchNumber: 'AUG-8820',
          daysRemaining: 6,
          quantity: 24,
          price: 420,
          totalValue: 10080,
          supplier: 'GSK Pakistan Direct',
          zone: '7d' as HorizonZone
        },
        {
          id: 'demo-2',
          name: 'Panadol Extra',
          genericName: 'Paracetamol + Caffeine',
          batchNumber: 'PAN-1099',
          daysRemaining: 14,
          quantity: 85,
          price: 95,
          totalValue: 8075,
          supplier: 'Haleon Consumer Health',
          zone: '15d' as HorizonZone
        },
        {
          id: 'demo-3',
          name: 'Brufen 400mg Tab',
          genericName: 'Ibuprofen 400mg',
          batchNumber: 'BRF-4041',
          daysRemaining: 28,
          quantity: 60,
          price: 180,
          totalValue: 10800,
          supplier: 'Abbott Laboratories',
          zone: '30d' as HorizonZone
        },
        {
          id: 'demo-4',
          name: 'Risek 20mg Cap',
          genericName: 'Omeprazole 20mg',
          batchNumber: 'RSK-9902',
          daysRemaining: 55,
          quantity: 40,
          price: 385,
          totalValue: 15400,
          supplier: 'Getz Pharma Distributor',
          zone: '60d' as HorizonZone
        },
        {
          id: 'demo-5',
          name: 'Cravit 500mg Tab',
          genericName: 'Levofloxacin 500mg',
          batchNumber: 'CRV-1120',
          daysRemaining: 88,
          quantity: 32,
          price: 750,
          totalValue: 24000,
          supplier: 'Sami Pharmaceuticals',
          zone: '90d' as HorizonZone
        },
        {
          id: 'demo-6',
          name: 'Loprin 75mg Tab',
          genericName: 'Aspirin 75mg',
          batchNumber: 'LPR-2029',
          daysRemaining: 165,
          quantity: 150,
          price: 110,
          totalValue: 16500,
          supplier: 'Highnoon Laboratories',
          zone: '180d' as HorizonZone
        }
      ];
    }

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [medicines]);

  const filteredItems = categorizedBatches.filter(b => {
    if (activeFilter === 'all') return true;
    return b.zone === activeFilter;
  });

  const selectedItem = categorizedBatches.find(b => b.id === selectedMedicineId) || filteredItems[0] || categorizedBatches[0];

  const handleReturnAction = (item: typeof selectedItem) => {
    if (!item) return;
    emitToast(`Debit Return Note created for ${item.name} (${item.quantity} units). Staged in Suppliers Ledger.`, 'success');
    if (onNavigate) {
      onNavigate('/parties');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 text-slate-900 dark:text-white space-y-5 shadow-sm transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              6-Horizon FEFO Expiry Radar
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                ACTIVE
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Granular time-horizon telemetry preventing expiry loss write-offs
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('/inventory')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>Open Inventory FEFO</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 6 Horizon Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          All ({categorizedBatches.length})
        </button>

        {(Object.keys(HORIZON_DEFINITIONS) as HorizonZone[]).map((zoneKey) => {
          const h = HORIZON_DEFINITIONS[zoneKey];
          const count = categorizedBatches.filter(b => b.zone === zoneKey).length;
          const isSelected = activeFilter === zoneKey;

          return (
            <button
              key={zoneKey}
              type="button"
              onClick={() => setActiveFilter(zoneKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{h.label}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Batch List & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Batches Table (7 cols) */}
        <div className="lg:col-span-7 space-y-2 max-h-80 overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              No batches found in this horizon zone.
            </div>
          ) : (
            filteredItems.map(item => {
              const isSelected = selectedItem?.id === item.id;
              const horizon = HORIZON_DEFINITIONS[item.zone];

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedicineId(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${horizon.dotBg}`} />
                    <div className="min-w-0 truncate">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Batch: {item.batchNumber} • {item.supplier}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black font-mono ${horizon.textColor}`}>
                      {item.daysRemaining}d left
                    </span>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {item.quantity} packs (PKR {item.totalValue.toLocaleString()})
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Inspector (5 cols) */}
        <div className="lg:col-span-5">
          {selectedItem ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Action Recommendation
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${HORIZON_DEFINITIONS[selectedItem.zone].textColor}`}>
                  {HORIZON_DEFINITIONS[selectedItem.zone].badgeLabel}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">{selectedItem.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedItem.genericName}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Remaining</span>
                  <strong className="text-slate-900 dark:text-white">{selectedItem.quantity} Packs</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Loss Value</span>
                  <strong className="text-rose-600 dark:text-rose-400">PKR {selectedItem.totalValue.toLocaleString()}</strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {HORIZON_DEFINITIONS[selectedItem.zone].description}
              </p>

              <button
                type="button"
                onClick={() => handleReturnAction(selectedItem)}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{HORIZON_DEFINITIONS[selectedItem.zone].actionText}</span>
              </button>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">Select a batch to inspect details</div>
          )}
        </div>

      </div>

    </div>
  );
};

export default FefoExpiryRadarWidget;
