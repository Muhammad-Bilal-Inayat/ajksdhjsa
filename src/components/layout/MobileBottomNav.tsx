import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, X, FileText, ArrowUpRight, ArrowDownLeft, RotateCcw, 
  ShoppingBag, FileSpreadsheet, FileCheck, Truck, ShoppingCart, 
  RotateCw, PackagePlus, Wallet, ArrowLeftRight, IndianRupee, AlertTriangle
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu?: () => void;
  onOpenQuickMenu?: () => void;
  isQuickMenuOpen?: boolean;
  onOpenScanner?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  onOpenMobileMenu
}) => {
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleOpenAddSale = () => {
    navigate('/billing?action=add');
    window.dispatchEvent(new CustomEvent('mbi-open-add-sale'));
  };

  const handleOpenAddPurchase = () => {
    navigate('/purchase?action=add');
    window.dispatchEvent(new CustomEvent('mbi-open-add-purchase'));
  };

  const handleAction = (path: string, eventName?: string) => {
    setIsSheetOpen(false);
    navigate(path);
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName));
    }
  };

  return (
    <>
      {/* 1. Mobile Fixed Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 px-2 sm:px-3 py-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-2xl select-none">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 max-w-md mx-auto">
          {/* Left: Add Sale Button (Red) */}
          <button
            type="button"
            onClick={handleOpenAddSale}
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 sm:px-3 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 active:scale-95 transition-all cursor-pointer min-w-0"
            title="Add Sale"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] shrink-0" />
            <span className="truncate">Add Sale</span>
          </button>

          {/* Center: Plus (+) Floating FAB Button */}
          <button
            type="button"
            onClick={() => setIsSheetOpen(prev => !prev)}
            className="-mt-5 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-slate-900/35 border-[3.5px] border-white dark:border-[#0f172a] shrink-0 mx-1 transition-transform cursor-pointer"
            aria-label="Open Transactions Menu"
            title="Quick Transactions"
          >
            <Plus className={`w-5.5 h-5.5 stroke-[2.5] transition-transform duration-200 ${isSheetOpen ? 'rotate-45' : ''}`} />
          </button>

          {/* Right: Add Purchase Button (Blue) */}
          <button
            type="button"
            onClick={handleOpenAddPurchase}
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 sm:px-3 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer min-w-0"
            title="Add Purchase"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] shrink-0" />
            <span className="truncate">Add Purchase</span>
          </button>
        </div>
      </div>

      {/* 2. Transaction Sheet Modal (Exact to uploaded screenshot) */}
      {isSheetOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center p-0 animate-in fade-in duration-200 select-none"
          onClick={() => setIsSheetOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#0f172a] w-full rounded-t-[32px] max-h-[90vh] overflow-y-auto px-4 sm:px-5 pt-4 sm:pt-5 pb-6 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Sheet Drag Handle */}
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 shrink-0" />

              {/* Section 1: Sale Transactions */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                    <span>Sale Transactions</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">7 Modules</span>
                </div>
                <div className="grid grid-cols-4 gap-y-3.5 gap-x-1.5 sm:gap-x-2 text-center">
                  {/* Sale invoices */}
                  <button
                    type="button"
                    onClick={() => handleAction('/billing?action=add', 'mbi-open-add-sale')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <div className="relative flex items-center justify-center">
                        <FileText className="w-5.5 h-5.5 stroke-[1.8]" />
                        <ArrowUpRight className="w-3 h-3 stroke-[2.5] absolute -top-1 -right-1 text-sky-600 dark:text-sky-400" />
                      </div>
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Sale Invoices
                      </span>
                    </div>
                  </button>

                  {/* Payment-In */}
                  <button
                    type="button"
                    onClick={() => handleAction('/sale/payment-in?action=add', 'mbi-open-payment-in')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <div className="relative flex items-center justify-center">
                        <IndianRupee className="w-5 h-5 stroke-[1.8]" />
                        <ArrowDownLeft className="w-3 h-3 stroke-[2.5] absolute -bottom-1 -left-1 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Payment-In
                      </span>
                    </div>
                  </button>

                  {/* Cr. Note/ Sale Return */}
                  <button
                    type="button"
                    onClick={() => handleAction('/sale/return?action=add')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <RotateCcw className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Sale Return
                      </span>
                    </div>
                  </button>

                  {/* Sale Order */}
                  <button
                    type="button"
                    onClick={() => handleAction('/sale/order?action=add')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <ShoppingBag className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Sale Order
                      </span>
                    </div>
                  </button>

                  {/* Estimate/ Quotation */}
                  <button
                    type="button"
                    onClick={() => handleAction('/sale/quotation?action=add')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <FileSpreadsheet className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Estimate / Quote
                      </span>
                    </div>
                  </button>

                  {/* Proforma Invoice */}
                  <button
                    type="button"
                    onClick={() => handleAction('/billing?type=proforma&action=add')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <FileCheck className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Proforma Inv.
                      </span>
                    </div>
                  </button>

                  {/* Delivery Challan */}
                  <button
                    type="button"
                    onClick={() => handleAction('/sale/challan?action=add')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-100 dark:border-cyan-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <Truck className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Challan
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 2: Purchase Transactions */}
              <div className="mb-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                    <span>Purchase Transactions</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">4 Modules</span>
                </div>
                <div className="grid grid-cols-4 gap-y-3.5 gap-x-1.5 sm:gap-x-2 text-center">
                  {/* Purchase */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase?action=add', 'mbi-open-add-purchase')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <ShoppingCart className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Purchase Bills
                      </span>
                    </div>
                  </button>

                  {/* Payment-Out */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase/payment-out?action=add', 'mbi-open-payment-out')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <div className="relative flex items-center justify-center">
                        <IndianRupee className="w-5 h-5 stroke-[1.8]" />
                        <ArrowUpRight className="w-3 h-3 stroke-[2.5] absolute -top-1 -right-1 text-rose-600 dark:text-rose-400" />
                      </div>
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Payment-Out
                      </span>
                    </div>
                  </button>

                  {/* Dr. Note/ Purchase Return */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase/return?action=add')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <RotateCw className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Purchase Return
                      </span>
                    </div>
                  </button>

                  {/* Purchase Order */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase/order?action=add')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <PackagePlus className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Purchase Order
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 3: Other Transactions */}
              <div className="mb-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500 inline-block"></span>
                    <span>Other Transactions</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">3 Modules</span>
                </div>
                <div className="grid grid-cols-4 gap-y-3.5 gap-x-1.5 sm:gap-x-2 text-center">
                  {/* Expenses */}
                  <button
                    type="button"
                    onClick={() => handleAction('/expenses?action=add', 'mbi-open-add-expense')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-100 dark:border-orange-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <Wallet className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Expenses
                      </span>
                    </div>
                  </button>

                  {/* Short Register */}
                  <button
                    type="button"
                    onClick={() => handleAction('/shortage-registry')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <AlertTriangle className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Short Book
                      </span>
                    </div>
                  </button>

                  {/* Party To Party Transfer */}
                  <button
                    type="button"
                    onClick={() => handleAction('/parties?action=transfer')}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shadow-2xs group-active:scale-90 transition-transform shrink-0">
                      <ArrowLeftRight className="w-5.5 h-5.5 stroke-[1.8]" />
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        Party Transfer
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Centered Floating Dark Close (X) Button */}
            <div className="pt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="w-11 h-11 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-90 text-white flex items-center justify-center shadow-lg shadow-slate-900/30 transition-all cursor-pointer"
                aria-label="Close Transactions Sheet"
                title="Close"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


