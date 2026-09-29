import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Plus, Sparkles, Tag, Calendar, Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import { Medicine, PurchaseBillItem } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { LastPurchaseRatesTooltip } from './LastPurchaseRatesTooltip';
import { PurchaseAutocomplete } from './PurchaseAutocomplete';

export interface PurchaseItemRowProps {
  index: number;
  item: PurchaseBillItem;
  medicines: Medicine[];
  rapidMode: boolean;
  onUpdate: (index: number, updatedItem: Partial<PurchaseBillItem>) => void;
  onDelete: (index: number) => void;
  onCommitRow: (index: number) => void;
  isLastRow: boolean;
  commonUnits?: string[];
}

export const PurchaseItemRow: React.FC<PurchaseItemRowProps> = ({
  index,
  item,
  medicines,
  rapidMode,
  onUpdate,
  onDelete,
  onCommitRow,
  isLastRow,
  commonUnits = ['BOX', 'STRIP', 'PCS', 'BOTTLE', 'PACK', 'VIAL', 'ROLL', 'BAG']
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const expiryInputRef = useRef<HTMLInputElement>(null);
  const mrpInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const discInputRef = useRef<HTMLInputElement>(null);

  // Find active medicine object if already selected
  useEffect(() => {
    if (item.medicineId) {
      const found = medicines.find(m => m.id === item.medicineId);
      if (found) setSelectedMed(found);
    }
  }, [item.medicineId, medicines]);

  const handleSelectMedicine = (med: Medicine) => {
    setSelectedMed(med);
    setIsSearchFocused(false);

    const mrp = Number(med.mrp || med.sellingPrice || med.salePrice || 0);
    const purchasePrice = Number(med.purchasePrice || med.latestPurchasePrice || (mrp > 0 ? mrp * 0.85 : 0));
    const qty = item.quantity > 0 ? item.quantity : 1;
    const discount = item.discountPercentage || 0;
    const lineTotal = (qty * purchasePrice) * (1 - discount / 100);

    onUpdate(index, {
      medicineId: med.id,
      name: med.name,
      unit: med.unit || item.unit || 'BOX',
      batchNumber: med.batchNumber || item.batchNumber || `B-${Date.now().toString().slice(-4)}`,
      expiryDate: med.expiryDate || item.expiryDate || '12/28',
      mrp: mrp,
      sellingPrice: mrp,
      purchasePrice: purchasePrice,
      quantity: qty,
      discountPercentage: discount,
      total: lineTotal
    });

    // Move to next field: Batch No
    requestAnimationFrame(() => {
      batchInputRef.current?.focus();
      batchInputRef.current?.select();
    });
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If no item was selected from dropdown, advance to batch
      batchInputRef.current?.focus();
      batchInputRef.current?.select();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsSearchFocused(false);
    }
  };

  const handleNumericChange = (field: 'quantity' | 'purchasePrice' | 'mrp' | 'discountPercentage', value: number) => {
    const updated = { ...item, [field]: value };
    if (field === 'mrp') {
      updated.sellingPrice = value;
    }
    const qty = field === 'quantity' ? value : item.quantity;
    const price = field === 'purchasePrice' ? value : item.purchasePrice;
    const disc = field === 'discountPercentage' ? value : (item.discountPercentage || 0);
    const lineTotal = (qty * price) * (1 - disc / 100);
    updated.total = Math.max(0, lineTotal);
    onUpdate(index, updated);
  };

  // Continuous Auto-Row Creation on Last Interactive Column (Enter / Tab)
  const handleLastFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (isLastRow) {
        e.preventDefault();
        onCommitRow(index);
        setTimeout(() => {
          const nextItemInput = document.getElementById(`purchase-item-search-${index + 1}`) as HTMLInputElement | null;
          if (nextItemInput) {
            nextItemInput.focus();
            nextItemInput.select();
          }
        }, 50);
      } else {
        if (e.key === 'Enter') {
          e.preventDefault();
          const nextItemInput = document.getElementById(`purchase-item-search-${index + 1}`) as HTMLInputElement | null;
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
      <td className="py-2.5 px-3 text-center text-xs font-mono font-bold text-slate-400 select-none w-10">
        #{index + 1}
      </td>

      {/* Item Name & Autocomplete Search */}
      <td className="py-2 px-3 relative min-w-[220px]">
        <input
          id={`purchase-item-search-${index}`}
          ref={nameInputRef}
          type="text"
          value={item.name || ''}
          onChange={(e) => {
            onUpdate(index, { name: e.target.value });
            setIsSearchFocused(true);
          }}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => {
            // slight delay to allow click selection
            setTimeout(() => setIsSearchFocused(false), 200);
          }}
          onKeyDown={handleNameKeyDown}
          placeholder="Search medicine / barcode..."
          data-pcell={`name-${index}`}
          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
        />

        {/* Autocomplete Dropdown List with Strict Row Focus Guard */}
        <PurchaseAutocomplete
          query={item.name || ''}
          isFocused={isSearchFocused}
          medicines={medicines}
          onSelect={handleSelectMedicine}
          onClose={() => setIsSearchFocused(false)}
        />
      </td>

      {/* Batch No */}
      <td className="py-2 px-2 w-28">
        <input
          ref={batchInputRef}
          type="text"
          value={item.batchNumber || ''}
          onChange={(e) => onUpdate(index, { batchNumber: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              expiryInputRef.current?.focus();
              expiryInputRef.current?.select();
            }
          }}
          placeholder="BATCH-01"
          data-pcell={`batch-${index}`}
          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
        />
      </td>

      {/* Exp Date (MM/YY or YYYY-MM) */}
      <td className="py-2 px-2 w-24">
        <input
          ref={expiryInputRef}
          type="text"
          value={item.expiryDate || ''}
          onChange={(e) => onUpdate(index, { expiryDate: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              mrpInputRef.current?.focus();
              mrpInputRef.current?.select();
            }
          }}
          placeholder="MM/YY"
          data-pcell={`expiry-${index}`}
          className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 text-center focus:ring-2 focus:ring-blue-500 outline-hidden"
        />
      </td>

      {/* MRP (Sale Price) */}
      <td className="py-2 px-2 w-28">
        <input
          ref={mrpInputRef}
          type="number"
          min="0"
          step="0.01"
          value={(item.mrp || item.sellingPrice) === 0 ? '' : (item.mrp || item.sellingPrice)}
          onChange={(e) => handleNumericChange('mrp', parseFloat(e.target.value) || 0)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              qtyInputRef.current?.focus();
              qtyInputRef.current?.select();
            }
          }}
          placeholder="0.00"
          data-pcell={`mrp-${index}`}
          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold text-right focus:ring-2 focus:ring-blue-500 outline-hidden"
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
          data-pcell={`qty-${index}`}
          className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white font-bold text-center focus:ring-2 focus:ring-blue-500 outline-hidden"
        />
      </td>

      {/* Purchase Price (Focus-Only Rate Popover) */}
      <td className="py-2 px-2 w-32 relative">
        <input
          ref={priceInputRef}
          type="number"
          min="0"
          step="0.01"
          value={item.purchasePrice === 0 ? '' : item.purchasePrice}
          onChange={(e) => handleNumericChange('purchasePrice', parseFloat(e.target.value) || 0)}
          onFocus={() => setIsPriceFocused(true)}
          onBlur={() => setIsPriceFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (rapidMode) {
                onCommitRow(index);
              } else {
                discInputRef.current?.focus();
                discInputRef.current?.select();
              }
            }
          }}
          placeholder="0.00"
          data-pcell={`price-${index}`}
          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-blue-600 dark:text-blue-400 font-black text-right focus:ring-2 focus:ring-blue-500 outline-hidden"
        />

        {/* Floating Rate Tooltip - Shows strictly on Focus */}
        <LastPurchaseRatesTooltip
          isOpen={isPriceFocused}
          medicine={selectedMed}
          currentPrice={item.purchasePrice}
        />
      </td>

      {/* Discount % */}
      <td className="py-2 px-2 w-20">
        <input
          ref={discInputRef}
          type="number"
          min="0"
          max="100"
          value={item.discountPercentage === 0 ? '' : item.discountPercentage}
          onChange={(e) => handleNumericChange('discountPercentage', parseFloat(e.target.value) || 0)}
          onKeyDown={handleLastFieldKeyDown}
          placeholder="0"
          data-pcell={`disc-${index}`}
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

