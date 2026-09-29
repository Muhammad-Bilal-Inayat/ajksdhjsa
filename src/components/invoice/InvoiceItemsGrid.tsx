import React, { useState, useRef, useEffect } from 'react';
import { 
  Trash2, Plus, Search, ChevronDown, Sparkles, AlertTriangle, 
  Check, Calendar, Hash, ArrowUpDown, Tag, Percent, DollarSign, Layers 
} from 'lucide-react';
import { Medicine, InvoiceColumnConfig } from '../../types/invoice';
import { calculateDaysUntilExpiry } from '../../lib/fefoEngine';

export interface GridRowItem {
  id?: string;
  tempId: string;
  medicineId?: string;
  name: string;
  genericName?: string;
  strength?: string;
  brand?: string;
  manufacturer?: string;
  barcode?: string;
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  mrp?: number;
  quantity: number;
  freeQuantity?: number;
  discountPercentage?: number;
  discountAmount?: number;
  unit: string;
  pricePerUnit: number;
  sellingPrice?: number;
  purchasePrice?: number;
  taxPercentage?: number;
  taxAmount?: number;
  total: number;
}

interface InvoiceItemsGridProps {
  mode: 'Sale' | 'Purchase';
  items: GridRowItem[];
  columnConfig: InvoiceColumnConfig;
  catalogMedicines: Medicine[];
  onUpdateItem: (tempId: string, updates: Partial<GridRowItem>) => void;
  onDeleteItem: (tempId: string) => void;
  onAddRow: () => void;
  onSelectItemFromCatalog?: (tempId: string, medicine: Medicine) => void;
}

const UNIT_OPTIONS = ['Box', 'Pack', 'Strip', 'Bottle', 'Vial', 'Ampoule', 'Pcs', 'Tab', 'Cap', 'Syrup', 'Tube', 'Sachet', 'None'];

export const InvoiceItemsGrid: React.FC<InvoiceItemsGridProps> = ({
  mode,
  items,
  columnConfig,
  catalogMedicines,
  onUpdateItem,
  onDeleteItem,
  onAddRow,
  onSelectItemFromCatalog
}) => {
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Search filtered medicines
  const filteredCatalog = React.useMemo(() => {
    if (!searchQuery || searchQuery.trim().length === 0) return catalogMedicines.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return catalogMedicines
      .filter(m => 
        m.name?.toLowerCase().includes(q) || 
        m.genericName?.toLowerCase().includes(q) ||
        m.barcode?.toLowerCase().includes(q) ||
        m.manufacturer?.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [catalogMedicines, searchQuery]);

  const handleSelectMedicine = (tempId: string, med: Medicine) => {
    const isPurchase = mode === 'Purchase';
    const rate = isPurchase 
      ? (med.purchasePrice || med.salePrice || 0) 
      : (med.salePrice || med.mrp || med.purchasePrice || 0);

    const updates: Partial<GridRowItem> = {
      medicineId: med.id,
      name: med.name,
      genericName: med.genericName,
      strength: med.strength,
      brand: med.manufacturer,
      manufacturer: med.manufacturer,
      barcode: med.barcode,
      batchNumber: med.batchNumber || '',
      expiryDate: med.expiryDate || '',
      mrp: med.mrp || med.salePrice || 0,
      pricePerUnit: rate,
      sellingPrice: med.salePrice || 0,
      purchasePrice: med.purchasePrice || 0,
      unit: med.unit || 'Box',
      hsnCode: (med as any).hsnCode || '3004'
    };

    const qty = 1;
    const disc = 0;
    const tax = 0;
    const sub = qty * rate;
    const discVal = sub * (disc / 100);
    const taxVal = (sub - discVal) * (tax / 100);
    updates.total = Math.round((sub - discVal + taxVal) * 100) / 100;

    if (onSelectItemFromCatalog) {
      onSelectItemFromCatalog(tempId, med);
    } else {
      onUpdateItem(tempId, updates);
    }

    setActiveSearchRowId(null);
    setSearchQuery('');
  };

  const calculateRowTotal = (
    qty: number,
    price: number,
    discPercent: number = 0,
    taxPercent: number = 0
  ) => {
    const base = (Number(qty) || 0) * (Number(price) || 0);
    const discVal = base * ((Number(discPercent) || 0) / 100);
    const taxable = base - discVal;
    const taxVal = taxable * ((Number(taxPercent) || 0) / 100);
    return Math.round((taxable + taxVal) * 100) / 100;
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto min-h-[220px]">
        <table className="w-full text-left border-collapse text-xs">
          {/* Table Header */}
          <thead>
            <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-700 select-none uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3 min-w-[200px] lg:min-w-[240px]">
                Item Description ({mode === 'Purchase' ? 'Inward Drug' : 'Medicine'})
              </th>
              
              {columnConfig.showHsn && (
                <th className="py-2.5 px-2 w-24">HSN/SAC</th>
              )}

              {columnConfig.showBatch && (
                <th className="py-2.5 px-2 w-28">Batch No.</th>
              )}

              {columnConfig.showExpiry && (
                <th className="py-2.5 px-2 w-28">Exp. Date</th>
              )}

              {columnConfig.showMrp && (
                <th className="py-2.5 px-2 w-24 text-right">MRP (Rs)</th>
              )}

              <th className="py-2.5 px-2 w-20 text-center">Qty</th>

              {columnConfig.showFreeQuantity && (
                <th className="py-2.5 px-2 w-20 text-center">Free Qty</th>
              )}

              {columnConfig.showDiscount && (
                <th className="py-2.5 px-2 w-20 text-right">Disc %</th>
              )}

              {columnConfig.showUnit && (
                <th className="py-2.5 px-2 w-24">Unit</th>
              )}

              <th className="py-2.5 px-2 w-28 text-right">
                {mode === 'Purchase' ? 'Cost Price' : 'Price / Unit'}
              </th>

              {columnConfig.showTaxGst && (
                <th className="py-2.5 px-2 w-20 text-right">Tax %</th>
              )}

              <th className="py-2.5 px-3 w-28 text-right">Amount (Rs)</th>
              <th className="py-2.5 px-2 w-12 text-center">Act</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-100">
            {items.map((row, index) => {
              const daysToExpiry = row.expiryDate ? calculateDaysUntilExpiry(row.expiryDate) : null;
              const isNearExpiry = daysToExpiry !== null && daysToExpiry <= 90 && daysToExpiry > 0;
              const isExpired = daysToExpiry !== null && daysToExpiry <= 0;

              return (
                <tr 
                  key={row.tempId || index}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  {/* Row Number */}
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                    {index + 1}
                  </td>

                  {/* Item Search / Name */}
                  <td className="py-1.5 px-2 relative">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={row.name}
                        placeholder={mode === 'Purchase' ? 'Type medicine name or scan barcode...' : 'Search medicine (F2)...'}
                        onChange={(e) => {
                          onUpdateItem(row.tempId, { name: e.target.value });
                          setSearchQuery(e.target.value);
                          setActiveSearchRowId(row.tempId);
                        }}
                        onFocus={() => {
                          setSearchQuery(row.name || '');
                          setActiveSearchRowId(row.tempId);
                        }}
                        className="w-full bg-slate-50/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                      />
                      {row.medicineId && (
                        <span className="absolute right-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                          Linked
                        </span>
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {activeSearchRowId === row.tempId && filteredCatalog.length > 0 && (
                      <div className="absolute top-full left-2 right-2 mt-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1 text-xs">
                        <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 rounded-md mb-1 flex items-center justify-between">
                          <span>Matching Medicines ({filteredCatalog.length})</span>
                          <span className="text-blue-600 font-semibold">Click to select</span>
                        </div>
                        {filteredCatalog.map((med) => (
                          <div
                            key={med.id}
                            onClick={() => handleSelectMedicine(row.tempId, med)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg cursor-pointer flex items-center justify-between transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {med.name} {med.strength && <span className="text-blue-600 font-medium">({med.strength})</span>}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {med.genericName || med.manufacturer || 'General Drug'} • Batch: {med.batchNumber || 'N/A'} • Exp: {med.expiryDate || 'N/A'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-extrabold text-blue-600 dark:text-blue-400">
                                Rs {mode === 'Purchase' ? (med.purchasePrice || med.salePrice || 0) : (med.salePrice || med.mrp || 0)}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Stock: {med.quantity || 0}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* HSN / SAC */}
                  {columnConfig.showHsn && (
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={row.hsnCode || ''}
                        placeholder="3004"
                        onChange={(e) => onUpdateItem(row.tempId, { hsnCode: e.target.value })}
                        className="w-full bg-slate-50/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-mono text-center focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  )}

                  {/* Batch Number */}
                  {columnConfig.showBatch && (
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={row.batchNumber || ''}
                        placeholder="BATCH-01"
                        onChange={(e) => onUpdateItem(row.tempId, { batchNumber: e.target.value })}
                        className="w-full bg-slate-50/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase font-mono focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  )}

                  {/* Expiry Date */}
                  {columnConfig.showExpiry && (
                    <td className="py-1.5 px-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={row.expiryDate || ''}
                          placeholder="MM/YYYY"
                          onChange={(e) => onUpdateItem(row.tempId, { expiryDate: e.target.value })}
                          className={`w-full bg-slate-50/80 dark:bg-slate-800 border rounded-lg px-2 py-1.5 text-xs font-mono text-center focus:ring-2 focus:ring-blue-500 ${
                            isExpired
                              ? 'border-rose-400 bg-rose-50 text-rose-700 font-bold'
                              : isNearExpiry
                              ? 'border-amber-400 bg-amber-50 text-amber-800 font-bold'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        />
                        {isExpired && (
                          <span className="absolute -top-2 right-1 px-1 bg-rose-600 text-white text-[8px] font-black rounded">
                            EXP
                          </span>
                        )}
                        {isNearExpiry && (
                          <span className="absolute -top-2 right-1 px-1 bg-amber-600 text-white text-[8px] font-black rounded">
                            {daysToExpiry}d
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* MRP */}
                  {columnConfig.showMrp && (
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.mrp !== undefined ? row.mrp : ''}
                        placeholder="0.00"
                        onChange={(e) => onUpdateItem(row.tempId, { mrp: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-right font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  )}

                  {/* Qty */}
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      min="1"
                      value={row.quantity !== undefined ? row.quantity : 1}
                      onChange={(e) => {
                        const qty = parseFloat(e.target.value) || 0;
                        const total = calculateRowTotal(qty, row.pricePerUnit, row.discountPercentage, row.taxPercentage);
                        onUpdateItem(row.tempId, { quantity: qty, total });
                      }}
                      className="w-full bg-blue-50/60 dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg px-2 py-1.5 text-xs font-black text-center text-blue-900 dark:text-blue-200 focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* Free Qty */}
                  {columnConfig.showFreeQuantity && (
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="0"
                        value={row.freeQuantity !== undefined ? row.freeQuantity : 0}
                        placeholder="0"
                        onChange={(e) => onUpdateItem(row.tempId, { freeQuantity: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-emerald-50/60 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-emerald-800 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                  )}

                  {/* Disc % */}
                  {columnConfig.showDiscount && (
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={row.discountPercentage !== undefined ? row.discountPercentage : 0}
                        placeholder="0"
                        onChange={(e) => {
                          const disc = parseFloat(e.target.value) || 0;
                          const total = calculateRowTotal(row.quantity, row.pricePerUnit, disc, row.taxPercentage);
                          onUpdateItem(row.tempId, { discountPercentage: disc, total });
                        }}
                        className="w-full bg-slate-50/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-right font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  )}

                  {/* Unit */}
                  {columnConfig.showUnit && (
                    <td className="py-1.5 px-2">
                      <select
                        value={row.unit || 'Box'}
                        onChange={(e) => onUpdateItem(row.tempId, { unit: e.target.value })}
                        className="w-full bg-slate-50/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                  )}

                  {/* Price / Unit */}
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.pricePerUnit !== undefined ? row.pricePerUnit : 0}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value) || 0;
                        const total = calculateRowTotal(row.quantity, price, row.discountPercentage, row.taxPercentage);
                        onUpdateItem(row.tempId, { pricePerUnit: price, total });
                      }}
                      className="w-full bg-slate-50/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-right font-black text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </td>

                  {/* Tax / GST % */}
                  {columnConfig.showTaxGst && (
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={row.taxPercentage !== undefined ? row.taxPercentage : 0}
                        placeholder="0"
                        onChange={(e) => {
                          const tax = parseFloat(e.target.value) || 0;
                          const total = calculateRowTotal(row.quantity, row.pricePerUnit, row.discountPercentage, tax);
                          onUpdateItem(row.tempId, { taxPercentage: tax, total });
                        }}
                        className="w-full bg-slate-50/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-right font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  )}

                  {/* Amount (Rs) */}
                  <td className="py-2 px-3 text-right font-black text-xs text-blue-700 dark:text-blue-300 font-mono">
                    Rs {(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Actions (Delete) */}
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteItem(row.tempId)}
                      disabled={items.length <= 1}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Delete Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Grid Bottom Action Bar */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddRow}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ ADD ROW</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Rows: <strong className="text-slate-900 dark:text-white">{items.length}</strong></span>
          <span>•</span>
          <span>Total Qty: <strong className="text-blue-600 dark:text-blue-400">{items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)}</strong></span>
        </div>
      </div>
    </div>
  );
};
