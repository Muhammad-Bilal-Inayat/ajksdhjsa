import React, { useState } from 'react';
import { 
  ShieldAlert, Clock, AlertTriangle, CheckCircle2, 
  RotateCcw, Sparkles, Filter, ChevronRight, Activity, ArrowRight,
  TrendingDown, RefreshCw, Layers, Zap, Package, FileText, Check
} from 'lucide-react';
import { emitToast } from '../../contexts/ToastContext';

export type HorizonZone = '7d' | '15d' | '30d' | '60d' | '90d' | '180d';

export interface HorizonConfig {
  id: HorizonZone;
  label: string;
  daysMax: number;
  badgeLabel: string;
  colorName: string;
  ringClass: string;
  dotBg: string;
  textColor: string;
  actionText: string;
  actionType: 'supplier_return' | 'clearance' | 'pos_push' | 'sell_fast' | 'audit' | 'stable';
  ringRadiusPercent: number; // For radar concentric ring layout
  description: string;
}

export const HORIZON_DEFINITIONS: Record<HorizonZone, HorizonConfig> = {
  '7d': {
    id: '7d',
    label: '7 Days',
    daysMax: 7,
    badgeLabel: '🔴 Critical Emergency',
    colorName: 'rose',
    ringClass: 'border-red-500/60 bg-red-950/20 shadow-red-500/20',
    dotBg: 'bg-red-500 text-red-100 border-red-300 shadow-red-500/80',
    textColor: 'text-red-600 dark:text-red-400',
    actionText: 'Immediate Supplier Debit Return',
    actionType: 'supplier_return',
    ringRadiusPercent: 20,
    description: 'Under 7 days remaining. Block retail sale & dispatch debit return note to supplier.'
  },
  '15d': {
    id: '15d',
    label: '15 Days',
    daysMax: 15,
    badgeLabel: '🟠 Ultra Near Expiry',
    colorName: 'orange',
    ringClass: 'border-orange-500/50 bg-orange-950/15 shadow-orange-500/20',
    dotBg: 'bg-orange-500 text-orange-100 border-orange-300 shadow-orange-500/70',
    textColor: 'text-orange-600 dark:text-orange-400',
    actionText: 'Urgent Clearance Discount',
    actionType: 'clearance',
    ringRadiusPercent: 35,
    description: 'Under 15 days remaining. Apply prompt clearance discount or schedule supplier return.'
  },
  '30d': {
    id: '30d',
    label: '30 Days',
    daysMax: 30,
    badgeLabel: '🟡 Near Expiry',
    colorName: 'amber',
    ringClass: 'border-amber-500/40 bg-amber-950/10 shadow-amber-500/10',
    dotBg: 'bg-amber-500 text-amber-100 border-amber-300 shadow-amber-500/60',
    textColor: 'text-amber-600 dark:text-amber-400',
    actionText: 'Automatic POS FEFO Priority Push',
    actionType: 'pos_push',
    ringRadiusPercent: 50,
    description: 'Under 30 days remaining. POS billing terminal auto-selects this batch on priority.'
  },
  '60d': {
    id: '60d',
    label: '60 Days',
    daysMax: 60,
    badgeLabel: '🔵 Medium Orbit',
    colorName: 'blue',
    ringClass: 'border-blue-500/30 bg-blue-950/5',
    dotBg: 'bg-blue-500 text-blue-100 border-blue-300 shadow-blue-500/50',
    textColor: 'text-blue-600 dark:text-blue-400',
    actionText: 'Sell Fast Alert',
    actionType: 'sell_fast',
    ringRadiusPercent: 65,
    description: '60 days buffer. High-velocity stock rotation recommended across front counters.'
  },
  '90d': {
    id: '90d',
    label: '90 Days',
    daysMax: 90,
    badgeLabel: '🟣 Quarterly Watch',
    colorName: 'purple',
    ringClass: 'border-purple-500/30 bg-purple-950/5',
    dotBg: 'bg-purple-500 text-purple-100 border-purple-300 shadow-purple-500/50',
    textColor: 'text-purple-600 dark:text-purple-400',
    actionText: 'Inventory Audit',
    actionType: 'audit',
    ringRadiusPercent: 80,
    description: '90 days horizon. Warehouse stock audit and supplier replacement verification.'
  },
  '180d': {
    id: '180d',
    label: '180 Days',
    daysMax: 180,
    badgeLabel: '🟢 6-Month Healthy',
    colorName: 'emerald',
    ringClass: 'border-emerald-500/30 bg-emerald-950/5',
    dotBg: 'bg-emerald-500 text-emerald-100 border-emerald-300 shadow-emerald-500/40',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    actionText: 'Healthy Stable Stock',
    actionType: 'stable',
    ringRadiusPercent: 95,
    description: '180+ days healthy stock. Standard FEFO FIFO automated warehouse staging.'
  }
};

export interface RadarBatchBlip {
  id: string;
  name: string;
  generic: string;
  batch: string;
  daysRemaining: number;
  qty: number;
  packPrice: number;
  totalLossValue: number;
  supplier: string;
  zone: HorizonZone;
  top: string; // Percentage for 2D radar plane
  left: string;
}

export const SAMPLE_RADAR_BLIPS: RadarBatchBlip[] = [
  {
    id: 'b-7d-1',
    name: 'Augmentin 625mg Tab',
    generic: 'Co-Amoxiclav 625mg',
    batch: 'AUG-8820',
    daysRemaining: 5,
    qty: 24,
    packPrice: 420,
    totalLossValue: 10080,
    supplier: 'GSK Pakistan Direct',
    zone: '7d',
    top: '48%',
    left: '46%'
  },
  {
    id: 'b-7d-2',
    name: 'Panadol Extra (Strips)',
    generic: 'Paracetamol + Caffeine',
    batch: 'PAN-1099',
    daysRemaining: 7,
    qty: 85,
    packPrice: 95,
    totalLossValue: 8075,
    supplier: 'Haleon Consumer Health',
    zone: '7d',
    top: '52%',
    left: '52%'
  },
  {
    id: 'b-15d-1',
    name: 'Brufen 400mg Tab',
    generic: 'Ibuprofen 400mg',
    batch: 'BRF-4041',
    daysRemaining: 13,
    qty: 60,
    packPrice: 180,
    totalLossValue: 10800,
    supplier: 'Abbott Laboratories',
    zone: '15d',
    top: '38%',
    left: '40%'
  },
  {
    id: 'b-15d-2',
    name: 'Risek 20mg Cap',
    generic: 'Omeprazole 20mg',
    batch: 'RSK-9902',
    daysRemaining: 15,
    qty: 40,
    packPrice: 385,
    totalLossValue: 15400,
    supplier: 'Getz Pharma Distributor',
    zone: '15d',
    top: '62%',
    left: '58%'
  },
  {
    id: 'b-30d-1',
    name: 'Cravit 500mg Tab',
    generic: 'Levofloxacin 500mg',
    batch: 'CRV-1120',
    daysRemaining: 27,
    qty: 32,
    packPrice: 750,
    totalLossValue: 24000,
    supplier: 'Sami Pharmaceuticals',
    zone: '30d',
    top: '32%',
    left: '66%'
  },
  {
    id: 'b-30d-2',
    name: 'Kestine 10mg Tab',
    generic: 'Ebastine 10mg',
    batch: 'KST-3012',
    daysRemaining: 29,
    qty: 50,
    packPrice: 310,
    totalLossValue: 15500,
    supplier: 'PharmEvo Pvt Ltd',
    zone: '30d',
    top: '68%',
    left: '34%'
  },
  {
    id: 'b-60d-1',
    name: 'Sofvasc 5mg Tab',
    generic: 'Amlodipine 5mg',
    batch: 'SFV-7711',
    daysRemaining: 54,
    qty: 120,
    packPrice: 220,
    totalLossValue: 26400,
    supplier: 'Searle Company Ltd',
    zone: '60d',
    top: '22%',
    left: '42%'
  },
  {
    id: 'b-90d-1',
    name: 'Hydryllin Syrup 120ml',
    generic: 'Aminophylline Compound',
    batch: 'HYD-5509',
    daysRemaining: 84,
    qty: 90,
    packPrice: 165,
    totalLossValue: 14850,
    supplier: 'Searle Company Ltd',
    zone: '90d',
    top: '78%',
    left: '68%'
  },
  {
    id: 'b-180d-1',
    name: 'Loprin 75mg Tab',
    generic: 'Aspirin 75mg Micro-coated',
    batch: 'LPR-2029',
    daysRemaining: 162,
    qty: 200,
    packPrice: 110,
    totalLossValue: 22000,
    supplier: 'Highnoon Laboratories',
    zone: '180d',
    top: '14%',
    left: '74%'
  }
];

export const FefoRadarGraphic: React.FC = () => {
  const [selectedBlip, setSelectedBlip] = useState<RadarBatchBlip>(SAMPLE_RADAR_BLIPS[0]);
  const [activeFilter, setActiveFilter] = useState<HorizonZone | 'all'>('all');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);

  const filteredBlips = SAMPLE_RADAR_BLIPS.filter(b => {
    if (activeFilter === 'all') return true;
    return b.zone === activeFilter;
  });

  const totalAtRiskValue = SAMPLE_RADAR_BLIPS.reduce((sum, b) => sum + b.totalLossValue, 0);

  const handleExecuteAction = (blip: RadarBatchBlip) => {
    setIsProcessingAction(true);
    setTimeout(() => {
      setIsProcessingAction(false);
      const zoneConfig = HORIZON_DEFINITIONS[blip.zone];
      setActionDone(blip.id);
      emitToast(
        `✓ Action Executed: ${zoneConfig.actionText} generated for ${blip.name} (Batch: ${blip.batch})`,
        'success'
      );
      setTimeout(() => setActionDone(null), 4000);
    }, 600);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-900 dark:text-white relative overflow-hidden shadow-xl transition-colors">
      
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 relative z-10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-ping" />
            <span>6-Horizon FEFO Optical Batch Scanner</span>
          </div>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Automated Expiry Radar Telemetry
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Real-time radial batch scanner tracking expiring stock across 6 distinct action horizons.
          </p>
        </div>

        {/* Global At-Risk Loss Counter */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Protected Stock Value
            </span>
            <div className="text-base font-black text-slate-900 dark:text-white font-mono">
              PKR {totalAtRiskValue.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 6-Horizon Interactive Filter Bar */}
      <div className="pt-5 pb-3 relative z-10">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Horizons ({SAMPLE_RADAR_BLIPS.length})
          </button>

          {(Object.keys(HORIZON_DEFINITIONS) as HorizonZone[]).map((zoneKey) => {
            const h = HORIZON_DEFINITIONS[zoneKey];
            const count = SAMPLE_RADAR_BLIPS.filter(b => b.zone === zoneKey).length;
            const isSelected = activeFilter === zoneKey;

            return (
              <button
                key={zoneKey}
                type="button"
                onClick={() => setActiveFilter(zoneKey)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md font-black'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60'
                }`}
              >
                <span>{h.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Radar Screen & Interactive Batch Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-4 relative z-10">
        
        {/* ================================================================= */}
        {/* RADAR VISUAL DISPLAY (7 cols)                                    */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          
          <div className="relative w-72 h-72 sm:w-[380px] sm:h-[380px] rounded-full border-2 border-slate-300 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden shadow-2xl transition-colors">
            
            {/* 6 Concentric Zone Rings */}
            <div className="absolute w-[95%] h-[95%] rounded-full border border-emerald-500/20 dark:border-emerald-500/30 border-dashed" title="180-Day Stable Horizon" />
            <div className="absolute w-[80%] h-[80%] rounded-full border border-purple-500/25 dark:border-purple-500/35" title="90-Day Quarterly Watch" />
            <div className="absolute w-[65%] h-[65%] rounded-full border border-blue-500/30 dark:border-blue-500/40 border-dashed" title="60-Day Medium Orbit" />
            <div className="absolute w-[50%] h-[50%] rounded-full border border-amber-500/40 dark:border-amber-500/50" title="30-Day POS Push" />
            <div className="absolute w-[35%] h-[35%] rounded-full border border-orange-500/50 dark:border-orange-500/60" title="15-Day Clearance" />
            <div className="absolute w-[20%] h-[20%] rounded-full border-2 border-red-500/60 dark:border-red-500/80 bg-red-500/10 dark:bg-red-950/30 shadow-inner" title="7-Day Emergency Return" />

            {/* Radar Crosshairs */}
            <div className="absolute w-full h-[1px] bg-slate-300 dark:bg-slate-800" />
            <div className="absolute h-full w-[1px] bg-slate-300 dark:bg-slate-800" />
            <div className="absolute w-full h-[1px] bg-slate-200 dark:bg-slate-800/40 rotate-45" />
            <div className="absolute w-full h-[1px] bg-slate-200 dark:bg-slate-800/40 -rotate-45" />

            {/* Pure CSS 60FPS Rotating Radar Sweep Beam */}
            <div 
              className="absolute inset-0 origin-center pointer-events-none animate-radar-sweep"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, rgba(59, 130, 246, 0.35) 0deg, rgba(16, 185, 129, 0.15) 30deg, rgba(59, 130, 246, 0) 70deg, transparent 360deg)'
              }}
            />

            {/* Center Core Scanner Node */}
            <div className="w-7 h-7 rounded-full bg-blue-600/20 dark:bg-blue-500/30 border-2 border-blue-600 dark:border-blue-400 flex items-center justify-center z-20 shadow-md">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            </div>

            {/* Orbit Distance Labels */}
            <span className="absolute top-2 text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              180d
            </span>
            <span className="absolute top-8 text-[8px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              90d
            </span>
            <span className="absolute top-14 text-[8px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              60d
            </span>
            <span className="absolute top-21 text-[8px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              30d
            </span>
            <span className="absolute top-28 text-[8px] font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
              15d
            </span>
            <span className="absolute top-[148px] text-[7px] font-mono font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider">
              7d
            </span>

            {/* Interactive Target Blips */}
            {filteredBlips.map((blip) => {
              const isSelected = selectedBlip?.id === blip.id;
              const horizon = HORIZON_DEFINITIONS[blip.zone];

              return (
                <button
                  key={blip.id}
                  type="button"
                  onClick={() => setSelectedBlip(blip)}
                  style={{ top: blip.top, left: blip.left }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-transform duration-200 hover:scale-135 cursor-pointer group`}
                >
                  <div className={`relative w-4.5 h-4.5 rounded-full border-2 ${horizon.dotBg} flex items-center justify-center shadow-lg`}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                    {isSelected && (
                      <span className="absolute -inset-1 rounded-full border-2 border-white dark:border-cyan-400 animate-pulse" />
                    )}
                  </div>
                  
                  {/* Tooltip on Hover */}
                  <span className={`absolute left-6 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-950 text-white border border-slate-700 text-[10px] font-bold whitespace-nowrap shadow-xl z-40 transition-opacity ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none'
                  }`}>
                    {blip.name} • {blip.daysRemaining}d
                  </span>
                </button>
              );
            })}

          </div>

          {/* 6 Horizon Legend Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 text-[10px] font-bold text-slate-600 dark:text-slate-400 text-center w-full max-w-lg">
            <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> 7d Return</span>
            <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" /> 15d Clear</span>
            <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> 30d Push</span>
            <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> 60d Fast</span>
            <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" /> 90d Audit</span>
            <span className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> 180d Safe</span>
          </div>

        </div>

        {/* ================================================================= */}
        {/* SELECTED BATCH TELEMETRY INSPECTOR (5 cols)                      */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
            
            {/* Top Badge & Horizon */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Batch Expiry Inspector</span>
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${HORIZON_DEFINITIONS[selectedBlip.zone].ringClass} ${HORIZON_DEFINITIONS[selectedBlip.zone].textColor}`}>
                {HORIZON_DEFINITIONS[selectedBlip.zone].badgeLabel}
              </span>
            </div>

            {/* Medicine Details */}
            <div className="space-y-1">
              <h4 className="text-base sm:text-lg font-black text-slate-950 dark:text-white leading-tight">
                {selectedBlip.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">{selectedBlip.generic}</p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                <span>Batch: <strong>{selectedBlip.batch}</strong></span>
                <span>•</span>
                <span>Supplier: <strong>{selectedBlip.supplier}</strong></span>
              </div>
            </div>

            {/* 4 Metric Sub-Boxes */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Days Left</span>
                <div className={`text-base font-black font-mono ${HORIZON_DEFINITIONS[selectedBlip.zone].textColor}`}>
                  {selectedBlip.daysRemaining} Days
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Stock Remaining</span>
                <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                  {selectedBlip.qty} Units
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Unit TP Cost</span>
                <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                  PKR {selectedBlip.packPrice}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Value at Risk</span>
                <div className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                  PKR {selectedBlip.totalLossValue.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Suggested Automation Protocol */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>FEFO Automation Policy:</span>
              </span>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                {HORIZON_DEFINITIONS[selectedBlip.zone].description}
              </p>
            </div>

            {/* 1-Click Action Button */}
            <button
              type="button"
              disabled={isProcessingAction}
              onClick={() => handleExecuteAction(selectedBlip)}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 ${
                actionDone === selectedBlip.id
                  ? 'bg-emerald-600 text-white'
                  : selectedBlip.zone === '7d' || selectedBlip.zone === '15d'
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
              }`}
            >
              {isProcessingAction ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing FEFO Protocol...</span>
                </>
              ) : actionDone === selectedBlip.id ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Debit Note Dispatched to {selectedBlip.supplier}</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>⚡ 1-Click {HORIZON_DEFINITIONS[selectedBlip.zone].actionText}</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </>
              )}
            </button>

          </div>

          {/* Savings Metric Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 block">
                Average Monthly Wastage Saved
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300">
                Rs. 45,000 – Rs. 120,000 / month per pharmacy
              </span>
            </div>
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-pulse" />
          </div>

        </div>

      </div>

    </div>
  );
};

export default FefoRadarGraphic;
