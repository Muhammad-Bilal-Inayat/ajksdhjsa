import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Tag, Calendar, Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import { Medicine } from '../../types';
import { formatCurrency } from '../../lib/utils';

export interface PosInvoiceRowItem {
  id: string;
  medicineId?: string;
  name: string;
  genericName?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  mrp?: number;
  discount: number;
  total: number;
  availableStock?: number;
}

export interface PosItemRowProps {
  index: number;
  item: PosInvoiceRowItem;
  medicines: Medicine[];
  onUpdate: (index: number, updatedItem: Partial<PosInvoiceRowItem>) => void;
  onDelete: (index: number) => void;
  onAddNewRow: () => void;
  isLastRow: boolean;
}

export const PosItemRow: React.FC<PosItemRowProps> = ({
  index,
  item,
  medicines,
  onUpdate,
  onDelete,
  onAddNewRow,
  isLastRow
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const expiryInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const discInputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter medicines by item.name
  const filteredMedicines = React.useMemo(() => {
    if (!item.name || item.name.trim() === '') return medicines.slice(0, 15);
    const q = item.name.toLowerCase().trim();
    return medicines
      .filter((m) => 
        (m.name || '').toLowerCase().includes(q) || 
        (m.genericName || '').toLowerCase().includes(q) || 
        (m.barcode || '').toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [item.name, medicines]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredMedicines.length]);

  const handleSelectMedicine = (med: Medicine) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setIsSearchOpen(false);

    const price = Number(med.sellingPrice || med.salePrice || med.mrp || 0);
    const mrp = Number(med.mrp || med.salePrice || price);
    const qty = item.quantity > 0 ? item.quantity : 1;
    const disc = item.discount || 0;
    const lineTotal = (qty * price) * (1 - disc / 100);

    onUpdate(index, {
      medicineId: med.id,
      name: med.name,
      genericName: med.genericName,
      unit: med.unit || item.unit || 'BOX',
      batchNumber: med.batchNumber || item.batchNumber || 'MAIN',
      expiryDate: med.expiryDate || item.expiryDate || '12/28',
      unitPrice: price,
      mrp: mrp,
      quantity: qty,
      discount: disc,
      total: lineTotal,
      availableStock: med.quantity || 0
    });

    requestAnimationFrame(() => {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    });
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isSearchOpen) setIsSearchOpen(true);
      setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, filteredMedicines.length - 1)));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isSearchOpen && filteredMedicines[selectedIndex]) {
        handleSelectMedicine(filteredMedicines[selectedIndex]);
      } else {
        setIsSearchOpen(false);
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }
      return;
    }

    if (e.key === 'Tab' || e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const handleSearchBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsSearchOpen(false);
    }, 200);
  };

  const handleNumericChange = (field: 'quantity' | 'unitPrice' | 'discount', value: number) => {
    const qty = field === 'quantity' ? value : item.quantity;
    const price = field === 'unitPrice' ? value : item.unitPrice;
    const disc = field === 'discount' ? value : (item.discount || 0);
    const lineTotal = (qty * price) * (1 - disc / 100);

    onUpdate(index, {
      ...item,
      [field]: value,
      total: Math.max(0, lineTotal)
    });
  };

  // Continuous Auto-Row Creation on Last Interactive Column (Discount %)
  const handleLastFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (isLastRow) {
        e.preventDefault();
        onAddNewRow();
        setTimeout(() => {
          const nextItemInput = document.getElementById(`item-search-${index + 1}`) as HTMLInputElement | null;
          if (nextItemInput) {
            nextItemInput.focus();
            nextItemInput.select();
          }
        }, 50);
      } else {
        if (e.key === 'Enter') {
          e.preventDefault();
          const nextItemInput = document.getElementById(`item-search-${index + 1}`) as HTMLInputElement | null;
          if (nextItemInput) {
            nextItemInput.focus();
            nextItemInput.select();
          }
        }
      }
    }
  };

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      {/* Row Index with Clean Sequential Numbering */}
      <td className="py-2 px-3 text-center text-xs font-mono font-bold text-slate-400 select-none w-10">
        #{index + 1}
      </td>

      {/* Item Name & Autocomplete Search */}
      <td className="py-2 px-3 relative min-w-[220px]">
        <input
          id={`item-search-${index}`}
          ref={nameInputRef}
          type="text"
          value={item.name || ''}
          onChange={(e) => {
            onUpdate(index, { name: e.target.value });
            if (!isSearchOpen) setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          onBlur={handleSearchBlur}
          onKeyDown={handleNameKeyDown}
          placeholder="Search medicine / barcode..."
          data-pcell={`name-${index}`}
          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
        />

        {/* Autocomplete Dropdown List */}
        {isSearchOpen && filteredMedicines.length > 0 && (
          <div 
            className="absolute left-3 top-full mt-1 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] overflow-hidden max-h-56 overflow-y-auto custom-scrollbar"
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>INVENTORY ITEMS ({filteredMedicines.length})</span>
              <span>↑↓ to navigate • Enter to select</span>
            </div>

            {filteredMedicines.map((med, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={med.id || idx}
                  onClick={() => handleSelectMedicine(med)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-600 text-white font-bold' 
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs">{med.name}</div>
                    <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {med.genericName || 'No Generic'} • Stock: {med.quantity || 0}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold">
                      {formatCurrency(med.sellingPrice || med.salePrice || med.mrp || 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </td>

      {/* Batch No */}
      <td className="py-2 px-2 w-24">
        <input
          ref={batchInputRef}
          type="text"
          value={item.batchNumber || ''}
          onChange={(e) => onUpdate(index, { batchNumber: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              expiryInputRef.current?.focus();
            }
          }}
          placeholder="BATCH"
          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
        />
      </td>

      {/* Exp Date */}
      <td className="py-2 px-2 w-20">
        <input
          ref={expiryInputRef}
          type="text"
          value={item.expiryDate || ''}
          onChange={(e) => onUpdate(index, { expiryDate: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              qtyInputRef.current?.focus();
              qtyInputRef.current?.select();
            }
          }}
          placeholder="MM/YY"
          className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 text-center focus:ring-2 focus:ring-blue-500 outline-hidden"
        />
      </td>

      {/* Quantity */}
      <td className="py-2 px-2 w-20">
        <input
          ref={qtyInputRef}
          type="number"
          min="1"
          value={item.quantity === 0 ? '' : item.quantity}
          onChange={(e) => handleNumericChange('quantity', parseFloat(e.target.value) || 0)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              priceInputRef.current?.focus();
              priceInputRef.current?.select();
            }
          }}
          placeholder="1"
          className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white font-bold text-center focus:ring-2 focus:ring-blue-500 outline-hidden"
        />
      </td>

      {/* Unit Sale Price */}
      <td className="py-2 px-2 w-28">
        <input
          ref={priceInputRef}
          type="number"
          min="0"
          step="0.01"
          value={item.unitPrice === 0 ? '' : item.unitPrice}
          onChange={(e) => handleNumericChange('unitPrice', parseFloat(e.target.value) || 0)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              discInputRef.current?.focus();
              discInputRef.current?.select();
            }
          }}
          placeholder="0.00"
          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-black text-right focus:ring-2 focus:ring-blue-500 outline-hidden"
        />
      </td>

      {/* Discount % (Last Interactive Field - Triggers Auto Row Creation on Enter/Tab) */}
      <td className="py-2 px-2 w-20">
        <input
          ref={discInputRef}
          type="number"
          min="0"
          max="100"
          value={item.discount === 0 ? '' : item.discount}
          onChange={(e) => handleNumericChange('discount', parseFloat(e.target.value) || 0)}
          onKeyDown={handleLastFieldKeyDown}
          placeholder="0"
          className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-purple-600 dark:text-purple-400 text-center focus:ring-2 focus:ring-blue-500 outline-hidden"
        />
      </td>

      {/* Row Total */}
      <td className="py-2 px-3 text-right font-mono font-bold text-xs text-slate-900 dark:text-white w-28 select-none">
        {formatCurrency(item.total || 0)}
      </td>

      {/* Actions */}
      <td className="py-2 px-2 text-center w-12">
        <button
          type="button"
          onClick={() => onDelete(index)}
          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="Remove row"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
};
