import React, { useState } from 'react';
import { 
  FileText, ArrowDownLeft, RotateCcw, FileSpreadsheet, 
  ShoppingCart, Truck, Plus, Sparkles
} from 'lucide-react';
import { SalesInvoicesView } from './sales/SalesInvoicesView';
import { PaymentInView } from './sales/PaymentInView';
import { CreditNotesView } from './sales/CreditNotesView';
import { EstimatesView } from './sales/EstimatesView';
import { SaleOrdersView } from './sales/SaleOrdersView';
import { DeliveryChallansView } from './sales/DeliveryChallansView';

export type SalesSubView = 
  | 'invoices' 
  | 'payment-in' 
  | 'credit-notes' 
  | 'estimates' 
  | 'orders' 
  | 'challans';

export const Sales: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SalesSubView>('invoices');

  const tabs = [
    { id: 'invoices', label: 'Sale Invoices', icon: FileText, desc: 'GST/Non-GST tax invoices' },
    { id: 'payment-in', label: 'Payment In', icon: ArrowDownLeft, desc: 'Customer receipts & collections' },
    { id: 'credit-notes', label: 'Sale Return / Cr. Note', icon: RotateCcw, desc: 'Refunds & item returns' },
    { id: 'estimates', label: 'Estimate / Quotation', icon: FileSpreadsheet, desc: 'Draft quotes & estimates' },
    { id: 'orders', label: 'Sale Order', icon: ShoppingCart, desc: 'Customer advance orders' },
    { id: 'challans', label: 'Delivery Challan', icon: Truck, desc: 'Stock dispatch delivery slips' },
  ];

  return (
    <div className="space-y-4">
      {/* Sales Sub-Menu Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SalesSubView)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Sub-View Component */}
      {activeTab === 'invoices' && <SalesInvoicesView />}
      {activeTab === 'payment-in' && <PaymentInView />}
      {activeTab === 'credit-notes' && <CreditNotesView />}
      {activeTab === 'estimates' && <EstimatesView />}
      {activeTab === 'orders' && <SaleOrdersView />}
      {activeTab === 'challans' && <DeliveryChallansView />}
    </div>
  );
};

export default Sales;
