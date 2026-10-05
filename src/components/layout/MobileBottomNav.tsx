import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, X, FileText, ArrowUpRight, ArrowDownLeft, RotateCcw, 
  ShoppingBag, FileSpreadsheet, FileCheck, Truck, ShoppingCart, 
  RotateCw, PackagePlus, Wallet, ArrowLeftRight, IndianRupee, AlertTriangle, Zap,
  Home, Boxes, Users, Layers, Package
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface MobileBottomNavProps {
  onOpenMobileMenu?: () => void;
  onOpenQuickMenu?: () => void;
  isQuickMenuOpen?: boolean;
  onOpenScanner?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  onOpenMobileMenu
}) => {
  const { activeRole, canPerform, canAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const isHomeActive = location.pathname === '/user' || location.pathname === '/' || location.pathname === '/dashboard';
  const isInventoryActive = location.pathname.startsWith('/items') || location.pathname.startsWith('/inventory') || location.pathname.startsWith('/top-products');
  const isPartiesActive = location.pathname.startsWith('/parties') || location.pathname.startsWith('/accounts/ledgers');

  const isPurchaseRoleAllowed = 
    activeRole === 'Primary Admin' ||
    activeRole === 'Secondary Admin' ||
    activeRole === 'Admin' ||
    activeRole === 'Store Manager' ||
    activeRole === 'Pharmacist' ||
    canPerform('canCreatePurchase') ||
    canAccess('purchase');

  const isItemRoleAllowed =
    activeRole === 'Primary Admin' ||
    activeRole === 'Secondary Admin' ||
    activeRole === 'Admin' ||
    activeRole === 'Store Manager' ||
    activeRole === 'Pharmacist' ||
    canPerform('canAddEditItems') ||
    canAccess('items');

  const handleAction = (path: string, eventName?: string, isAllowed: boolean = true, lockMessage?: string) => {
    if (!isAllowed) {
      toast.error(lockMessage || `🔒 Action Locked: Your role (${activeRole}) cannot access this action.`);
      return;
    }
    setIsSheetOpen(false);
    navigate(path);
    if (eventName) {
      window.dispatchEvent(new CustomEvent(eventName));
    }
  };

  const handleMoreClick = () => {
    setIsSheetOpen(false);
    if (onOpenMobileMenu) {
      onOpenMobileMenu();
    } else {
      window.dispatchEvent(new CustomEvent('mbi-toggle-sidebar'));
    }
  };

  return (
    <>
      {/* 1. Mobile Fixed 5-Tab Dashboard Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 px-3 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl select-none">
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          
          {/* Tab 1: Home */}
          <button
            type="button"
            onClick={() => { setIsSheetOpen(false); navigate('/user'); }}
            className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer transition-colors group"
          >
            <div className={`p-1 rounded-xl transition-all ${isHomeActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`}>
              <Home className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className={`text-[10.5px] font-bold mt-0.5 leading-none transition-colors ${isHomeActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
              Home
            </span>
            {isHomeActive && (
              <span className="w-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-1 animate-in fade-in" />
            )}
          </button>

          {/* Tab 2: Inventory */}
          <button
            type="button"
            onClick={() => { setIsSheetOpen(false); navigate('/inventory'); }}
            className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer transition-colors group"
          >
            <div className={`p-1 rounded-xl transition-all ${isInventoryActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`}>
              <Boxes className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className={`text-[10.5px] font-bold mt-0.5 leading-none transition-colors ${isInventoryActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
              Inventory
            </span>
            {isInventoryActive && (
              <span className="w-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-1 animate-in fade-in" />
            )}
          </button>

          {/* Tab 3: Center Elevated Floating Plus (+) Button */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              type="button"
              onClick={() => setIsSheetOpen(prev => !prev)}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-indigo-600/35 border-[3.5px] border-white dark:border-[#0f172a] shrink-0 transition-transform cursor-pointer"
              aria-label="Open Quick Transactions Menu"
              title="Quick Transactions"
            >
              <Plus className={`w-6 h-6 stroke-[3] transition-transform duration-200 ${isSheetOpen ? 'rotate-45' : ''}`} />
            </button>
          </div>

          {/* Tab 4: Parties */}
          <button
            type="button"
            onClick={() => { setIsSheetOpen(false); navigate('/parties'); }}
            className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer transition-colors group"
          >
            <div className={`p-1 rounded-xl transition-all ${isPartiesActive ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'}`}>
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className={`text-[10.5px] font-bold mt-0.5 leading-none transition-colors ${isPartiesActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
              Parties
            </span>
            {isPartiesActive && (
              <span className="w-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-1 animate-in fade-in" />
            )}
          </button>

          {/* Tab 5: More */}
          <button
            type="button"
            onClick={handleMoreClick}
            className="flex-1 flex flex-col items-center justify-center py-1 cursor-pointer transition-colors group"
          >
            <div className="p-1 rounded-xl text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10.5px] font-bold mt-0.5 leading-none text-slate-500 dark:text-slate-400">
              More
            </span>
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
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3.5 shrink-0" />

              {/* Top 4 Primary Quick Action Cards (Direct POS & Inventory) */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                {/* + Sale */}
                <button
                  type="button"
                  onClick={() => handleAction('/billing?action=add', 'mbi-open-add-sale')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25 active:scale-95 transition-transform cursor-pointer"
                >
                  <FileText className="w-5 h-5 mb-1 stroke-[2.2]" />
                  <span className="text-[11px] font-black tracking-tight">+ Sale</span>
                </button>

                {/* POS Fast */}
                <button
                  type="button"
                  onClick={() => handleAction('/billing?mode=fast&action=add', 'mbi-open-fast-pos')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-gradient-to-b from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/25 active:scale-95 transition-transform cursor-pointer"
                >
                  <Zap className="w-5 h-5 mb-1 stroke-[2.2]" />
                  <span className="text-[11px] font-black tracking-tight">POS Fast</span>
                </button>

                {/* + Purchase */}
                <button
                  type="button"
                  onClick={() => handleAction('/purchase?action=add', 'mbi-open-add-purchase', isPurchaseRoleAllowed, `🔒 Purchase Locked: Your role (${activeRole}) cannot create purchase bills.`)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl text-white shadow-md active:scale-95 transition-transform cursor-pointer ${
                    !isPurchaseRoleAllowed
                      ? 'bg-gradient-to-b from-slate-500 to-slate-600 opacity-75'
                      : 'bg-gradient-to-b from-blue-500 to-indigo-600 shadow-blue-500/25'
                  }`}
                >
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5 mb-1 stroke-[2.2]" />
                    {!isPurchaseRoleAllowed && <span className="absolute -top-1.5 -right-2 text-[10px]">🔒</span>}
                  </div>
                  <span className="text-[11px] font-black tracking-tight">{!isPurchaseRoleAllowed ? '+ Purchase 🔒' : '+ Purchase'}</span>
                </button>

                {/* + Item */}
                <button
                  type="button"
                  onClick={() => handleAction('/items?action=add', undefined, isItemRoleAllowed, `🔒 Item Locked: Your role (${activeRole}) cannot add inventory items.`)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl text-white shadow-md active:scale-95 transition-transform cursor-pointer ${
                    !isItemRoleAllowed
                      ? 'bg-gradient-to-b from-slate-500 to-slate-600 opacity-75'
                      : 'bg-gradient-to-b from-emerald-500 to-teal-600 shadow-emerald-500/25'
                  }`}
                >
                  <div className="relative">
                    <PackagePlus className="w-5 h-5 mb-1 stroke-[2.2]" />
                    {!isItemRoleAllowed && <span className="absolute -top-1.5 -right-2 text-[10px]">🔒</span>}
                  </div>
                  <span className="text-[11px] font-black tracking-tight">{!isItemRoleAllowed ? '+ Item 🔒' : '+ Item'}</span>
                </button>
              </div>

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
                    onClick={() => handleAction('/purchase?action=add', 'mbi-open-add-purchase', isPurchaseRoleAllowed, `🔒 Purchase Locked: Your role (${activeRole}) cannot create purchase bills.`)}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xs group-active:scale-90 transition-transform shrink-0 relative ${
                      !isPurchaseRoleAllowed
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40'
                    }`}>
                      <ShoppingCart className="w-5.5 h-5.5 stroke-[1.8]" />
                      {!isPurchaseRoleAllowed && <span className="absolute -top-1 -right-1 text-[10px]">🔒</span>}
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        {!isPurchaseRoleAllowed ? 'Purchase 🔒' : 'Purchase Bills'}
                      </span>
                    </div>
                  </button>

                  {/* Payment-Out */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase/payment-out?action=add', 'mbi-open-payment-out', isPurchaseRoleAllowed, `🔒 Payment-Out Locked: Your role (${activeRole}) cannot create payment vouchers.`)}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xs group-active:scale-90 transition-transform shrink-0 relative ${
                      !isPurchaseRoleAllowed
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40'
                    }`}>
                      <div className="relative flex items-center justify-center">
                        <IndianRupee className="w-5 h-5 stroke-[1.8]" />
                        <ArrowUpRight className="w-3 h-3 stroke-[2.5] absolute -top-1 -right-1" />
                      </div>
                      {!isPurchaseRoleAllowed && <span className="absolute -top-1 -right-1 text-[10px]">🔒</span>}
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        {!isPurchaseRoleAllowed ? 'Payment 🔒' : 'Payment-Out'}
                      </span>
                    </div>
                  </button>

                  {/* Dr. Note/ Purchase Return */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase/return?action=add', undefined, isPurchaseRoleAllowed, `🔒 Purchase Return Locked: Your role (${activeRole}) cannot create purchase returns.`)}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xs group-active:scale-90 transition-transform shrink-0 relative ${
                      !isPurchaseRoleAllowed
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
                    }`}>
                      <RotateCw className="w-5.5 h-5.5 stroke-[1.8]" />
                      {!isPurchaseRoleAllowed && <span className="absolute -top-1 -right-1 text-[10px]">🔒</span>}
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        {!isPurchaseRoleAllowed ? 'Return 🔒' : 'Purchase Return'}
                      </span>
                    </div>
                  </button>

                  {/* Purchase Order */}
                  <button
                    type="button"
                    onClick={() => handleAction('/purchase/order?action=add', undefined, isPurchaseRoleAllowed, `🔒 Purchase Order Locked: Your role (${activeRole}) cannot create purchase orders.`)}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none p-1 rounded-xl transition-all active:scale-95"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xs group-active:scale-90 transition-transform shrink-0 relative ${
                      !isPurchaseRoleAllowed
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                        : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/40'
                    }`}>
                      <PackagePlus className="w-5.5 h-5.5 stroke-[1.8]" />
                      {!isPurchaseRoleAllowed && <span className="absolute -top-1 -right-1 text-[10px]">🔒</span>}
                    </div>
                    <div className="w-full mt-1.5 px-0.5 min-h-[28px] flex items-start justify-center">
                      <span className="text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-[1.25] break-words line-clamp-2">
                        {!isPurchaseRoleAllowed ? 'PO 🔒' : 'Purchase Order'}
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
                    onClick={() => {
                      const isAllowedExpense = activeRole === 'Primary Admin' || activeRole === 'Secondary Admin' || activeRole === 'Admin' || activeRole === 'Store Manager' || activeRole === 'Pharmacist' || canPerform('canManageExpenses') || canAccess('expenses');
                      handleAction('/expenses?action=add', 'mbi-open-add-expense', isAllowedExpense, `🔒 Expenses Locked: Your role (${activeRole}) cannot manage expenses.`);
                    }}
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


