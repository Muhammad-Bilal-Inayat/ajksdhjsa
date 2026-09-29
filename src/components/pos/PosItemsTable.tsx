import React from 'react';
import { Medicine } from '../../types';
import { PosItemRow, PosInvoiceRowItem } from './PosItemRow';
import { Plus } from 'lucide-react';

export interface PosItemsTableProps {
  items: PosInvoiceRowItem[];
  medicines: Medicine[];
  onUpdateItem: (index: number, updatedItem: Partial<PosInvoiceRowItem>) => void;
  onDeleteItem: (index: number) => void;
  onAddNewRow: () => void;
}

export const PosItemsTable: React.FC<PosItemsTableProps> = ({
  items,
  medicines,
  onUpdateItem,
  onDeleteItem,
  onAddNewRow
}) => {
  return (
    <div className="space-y-1.5 h-auto">
      <div className="max-h-[360px] overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2.5 px-3 text-center w-10">#</th>
              <th className="py-2.5 px-3 min-w-[220px]">Item Description</th>
              <th className="py-2.5 px-2 w-24">Batch</th>
              <th className="py-2.5 px-2 w-20 text-center">Expiry</th>
              <th className="py-2.5 px-2 w-20 text-center">Qty</th>
              <th className="py-2.5 px-2 w-28 text-right">Price</th>
              <th className="py-2.5 px-2 w-20 text-center">Disc %</th>
              <th className="py-2.5 px-3 text-right w-28">Total</th>
              <th className="py-2.5 px-2 text-center w-12">Act</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item, idx) => (
              <PosItemRow
                key={item.id}
                index={idx}
                item={item}
                medicines={medicines}
                onUpdate={onUpdateItem}
                onDelete={onDeleteItem}
                onAddNewRow={onAddNewRow}
                isLastRow={idx === items.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Tightly Docked Mini Actions */}
      <div className="flex items-center justify-between px-1 text-xs">
        <button
          type="button"
          onClick={onAddNewRow}
          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Row (Auto on Enter)</span>
        </button>
        <span className="text-[11px] text-slate-400">
          Items: <strong className="text-slate-700 dark:text-slate-200">{items.filter(i => i.name && i.name.trim()).length}</strong>
        </span>
      </div>
    </div>
  );
};

export default PosItemsTable;
