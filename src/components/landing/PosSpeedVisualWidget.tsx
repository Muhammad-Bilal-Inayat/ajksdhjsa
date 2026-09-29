import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, Scan, CheckCircle2, Receipt, Clock, Sparkles, 
  ArrowRight, ShieldCheck, Play, RefreshCw, Printer, 
  Check, Layers, Cpu, BarChart3, ShoppingCart
} from 'lucide-react';

interface MedicineDemoItem {
  id: string;
  name: string;
  generic: string;
  barcode: string;
  batch: string;
  expiry: string;
  price: number;
  qty: number;
}

const DEMO_ITEMS: MedicineDemoItem[] = [
  {
    id: 'demo-1',
    name: 'Augmentin 625mg Tab',
    generic: 'Co-Amoxiclav',
    barcode: '8964000182914',
    batch: 'AUG-8820',
    expiry: '04/2027',
    price: 420,
    qty: 1
  },
  {
    id: 'demo-2',
    name: 'Panadol Extra (10x10)',
    generic: 'Paracetamol + Caffeine',
    barcode: '8964000293812',
    batch: 'PAN-1099',
    expiry: '11/2026',
    price: 95,
    qty: 2
  },
  {
    id: 'demo-3',
    name: 'Risek 20mg Capsule',
    generic: 'Omeprazole 20mg',
    barcode: '8964000492817',
    batch: 'RSK-9902',
    expiry: '08/2027',
    price: 385,
    qty: 1
  },
  {
    id: 'demo-4',
    name: 'Cravit 500mg Tablet',
    generic: 'Levofloxacin 500mg',
    barcode: '8964000849201',
    batch: 'CRV-1120',
    expiry: '02/2028',
    price: 750,
    qty: 1
  }
];

export const PosSpeedVisualWidget: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<MedicineDemoItem>(DEMO_ITEMS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activeStep, setActiveStep] = useState<number>(4); // 0 = idle, 1=laser, 2=fefo, 3=margin, 4=done
  const [receiptAnimKey, setReceiptAnimKey] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll-triggered viewport detection for initial smooth receipt feed animation
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setReceiptAnimKey(prev => prev + 1);
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const startSimulation = (item: MedicineDemoItem = selectedItem) => {
    if (isScanning) return;
    setSelectedItem(item);
    setIsScanning(true);
    setElapsedMs(0);
    setActiveStep(1);

    const startTime = performance.now();

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const current = Math.round(performance.now() - startTime);
      if (current >= 200) {
        setElapsedMs(200);
        setIsScanning(false);
        setActiveStep(4);
        setReceiptAnimKey(prev => prev + 1);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setElapsedMs(current);
        if (current < 45) {
          setActiveStep(1);
        } else if (current < 110) {
          setActiveStep(2);
        } else if (current < 155) {
          setActiveStep(3);
        } else {
          setActiveStep(4);
        }
      }
    }, 10);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const totalBillAmount = selectedItem.price * selectedItem.qty;

  return (
    <div 
      ref={containerRef}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-900 dark:text-white relative overflow-hidden shadow-xl transition-colors"
    >
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 relative z-10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>⚡ Nano-Speed 0.2s POS Engine</span>
          </div>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            0.2-Second Barcode-to-Bill Simulation
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Watch optical laser scan, auto FEFO batch resolution, and ESC/POS thermal printing execute in under 200 milliseconds.
          </p>
        </div>

        {/* Live Millisecond Chronometer */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-700 text-blue-900 dark:text-blue-400 shadow-sm">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
            <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              POS Latency Counter
            </span>
            <div className="text-xl font-black font-mono text-blue-700 dark:text-emerald-400 flex items-baseline gap-1">
              <span>{(elapsedMs / 1000).toFixed(3)}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">sec</span>
              <span className="text-[10px] text-blue-600 dark:text-emerald-500 font-normal">({elapsedMs}ms)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Medicine Sample Selector */}
      <div className="pt-5 pb-3 relative z-10 space-y-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Select Medicine to Test Laser Scan:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {DEMO_ITEMS.map((item) => {
            const isSelected = selectedItem.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => startSimulation(item)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-400 shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {item.barcode}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 text-[11px] font-mono">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    PKR {item.price}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    Batch: {item.batch}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Simulation Visual: 4-Step Pipeline & Live Thermal Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-5 relative z-10">
        
        {/* ================================================================= */}
        {/* LEFT: Laser Scanning Box & 4-Phase Progress (7 cols)              */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Dual-Theme Optimized 3D Medicine Box with Animated Laser Scanner */}
          <div className="relative p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white overflow-hidden shadow-sm dark:shadow-2xl transition-colors">
            
            {/* Animated Laser Scanning Line */}
            {isScanning && (
              <div 
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#ef4444] z-30 animate-laser-scan pointer-events-none"
              />
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/40 text-[10px] font-mono font-bold">
                    OPTICAL SCANNER #1
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                    ● READY 60FPS
                  </span>
                </div>
                <h4 className="text-lg font-black text-slate-950 dark:text-white">{selectedItem.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Barcode: {selectedItem.barcode}</p>
              </div>

              {/* Simulated 1D Barcode Graphic with Clear Contrast */}
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-mono text-center shadow-xs">
                <div className="flex items-center justify-center gap-0.5 h-10 px-2">
                  {[4, 2, 6, 1, 5, 2, 4, 1, 3, 6, 2, 4, 5, 1, 3, 2, 5, 4, 2, 6].map((w, i) => (
                    <div 
                      key={i} 
                      className={`h-full ${i % 2 === 0 ? 'bg-slate-900 dark:bg-slate-100 opacity-100' : 'bg-slate-400 dark:bg-slate-600 opacity-40'}`} 
                      style={{ width: `${w}px` }} 
                    />
                  ))}
                </div>
                <span className="text-[9px] font-bold tracking-widest block mt-1 text-slate-700 dark:text-slate-300">{selectedItem.barcode}</span>
              </div>
            </div>

            {/* Live Trigger Action Button */}
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => startSimulation()}
                disabled={isScanning}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>{isScanning ? 'Scanning in Progress...' : '⚡ Run 0.2s Scan Simulation'}</span>
              </button>

              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Avg Response: <strong className="text-emerald-600 dark:text-emerald-400">188ms</strong>
              </div>
            </div>

          </div>

          {/* 4 Pipeline Micro-Steps with Soft Pastel Badges & Clear Legibility */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Sub-Millisecond Pipeline Breakdown (200ms total):
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              
              {/* Step 1 */}
              <div className={`p-3 rounded-2xl border transition-all ${
                activeStep >= 1
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-200'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60 text-slate-700 dark:text-slate-400'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span>01. Laser Read</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">38ms</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-[11px]">Optical Barcode</p>
              </div>

              {/* Step 2 */}
              <div className={`p-3 rounded-2xl border transition-all ${
                activeStep >= 2
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60 text-slate-700 dark:text-slate-400'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span>02. FEFO Matrix</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">62ms</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-[11px]">Batch {selectedItem.batch}</p>
              </div>

              {/* Step 3 */}
              <div className={`p-3 rounded-2xl border transition-all ${
                activeStep >= 3
                  ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-200'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60 text-slate-700 dark:text-slate-400'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span>03. Margin Guard</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">48ms</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-[11px]">Cost Lock Verified</p>
              </div>

              {/* Step 4 */}
              <div className={`p-3 rounded-2xl border transition-all ${
                activeStep >= 4
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60 text-slate-700 dark:text-slate-400'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-1">
                  <span>04. ESC/POS Print</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">52ms</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-[11px]">80mm Thermal Out</p>
              </div>

            </div>
          </div>

          {/* Speed Comparison Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">POS Execution Speed vs Legacy Pharmacy Desktop</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black">17x Faster</span>
            </div>
            
            <div className="space-y-1.5 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-500 mb-0.5">
                  <span>MBI INVENTRA POS (0.2s):</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">200ms</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[6%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-500 mb-0.5">
                  <span>Legacy Slow Desktop Software (3.4s):</span>
                  <span className="font-mono font-bold text-rose-500">3,400ms</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full w-[100%]" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ================================================================= */}
        {/* RIGHT: Live 80mm ESC/POS Thermal Receipt Paper Preview (5 cols)   */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 flex flex-col items-center">
          
          <div className="w-full max-w-sm rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-4 shadow-xl">
            
            {/* Top Receipt Printer Slot */}
            <div className="h-3 w-40 mx-auto bg-slate-300 dark:bg-slate-800 rounded-full mb-3 shadow-inner flex items-center justify-center">
              <div className="h-1 w-32 bg-slate-400 dark:bg-slate-950 rounded-full" />
            </div>

            {/* Thermal Slip Paper with Smooth Scroll & Trigger Feed Animation */}
            <div 
              key={receiptAnimKey}
              className={`bg-white text-slate-900 rounded-2xl p-5 shadow-2xl font-mono text-xs space-y-3 border border-slate-200 animate-receipt-feed transition-all duration-300 ${
                isScanning ? 'opacity-60 scale-98 translate-y-1' : 'opacity-100 scale-100 translate-y-0'
              }`}
            >
              
              {/* Slip Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2.5">
                <h5 className="font-black text-sm tracking-wider uppercase text-slate-950">
                  MBI INVENTRA PHARMACY
                </h5>
                <p className="text-[10px] text-slate-500">Main Boulevard, Liberty, Lahore</p>
                <p className="text-[10px] text-slate-500">Phone: 0328-1302636</p>
                <div className="flex justify-between text-[9px] text-slate-400 pt-1">
                  <span>INV #9042</span>
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              </div>

              {/* Item Line */}
              <div className="space-y-1.5 py-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span className="truncate max-w-[170px] text-slate-950">{selectedItem.name}</span>
                  <span className="text-slate-950">PKR {totalBillAmount}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Batch: {selectedItem.batch} (Exp: {selectedItem.expiry})</span>
                  <span>{selectedItem.qty} x {selectedItem.price}</span>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>PKR {totalBillAmount}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (0%):</span>
                  <span>PKR 0</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-950 border-t border-slate-300 pt-1">
                  <span>NET TOTAL:</span>
                  <span className="text-emerald-700 font-bold">PKR {totalBillAmount}</span>
                </div>
              </div>

              {/* Official Thermal Receipt Footer */}
              <div className="pt-2 text-center text-[10px] font-mono border-t border-dashed border-slate-300 dark:border-slate-600 space-y-1 mt-2">
                <p className="font-bold text-slate-800 dark:text-slate-200 tracking-wider">THANK YOU FOR SHOPPING!</p>
                <p className="text-slate-600 dark:text-slate-400">Contact us : 03281302636</p>
                <div className="pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between text-[9px] text-slate-500">
                  <span>Pharmacy POS &amp; ERP</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">www.mbiinventra.com</span>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mt-3 px-2">
              <span className="flex items-center gap-1">
                <Printer className="w-3.5 h-3.5 text-blue-500" />
                80mm ESC/POS Direct
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                0.2s Zero Delay
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default PosSpeedVisualWidget;
