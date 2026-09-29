import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Medicine } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Search, Tag, Package } from 'lucide-react';

export interface PurchaseAutocompleteProps {
  query: string;
  isFocused: boolean;
  medicines: Medicine[];
  onSelect: (medicine: Medicine) => void;
  onClose: () => void;
}

export const PurchaseAutocomplete: React.FC<PurchaseAutocompleteProps> = ({
  query,
  isFocused,
  medicines,
  onSelect,
  onClose
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter medicines only when query has text
  const filteredMedicines = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    return medicines
      .filter((m) => 
        (m.name || '').toLowerCase().includes(q) || 
        (m.genericName || '').toLowerCase().includes(q) || 
        (m.barcode || '').toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [query, medicines]);

  // Strict Row Focus Guard & No empty box rule
  const isDropdownVisible = isFocused && query.trim().length > 0 && filteredMedicines.length > 0;

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredMedicines.length]);

  // Document-wide Click Outside Listener (Forceful Unmount)
  useEffect(() => {
    if (!isDropdownVisible) return;

    const handleDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleDocumentClick, true);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick, true);
    };
  }, [isDropdownVisible, onClose]);

  // Keyboard navigation inside dropdown list
  useEffect(() => {
    if (!isDropdownVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredMedicines.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        if (filteredMedicines[selectedIndex]) {
          e.preventDefault();
          onSelect(filteredMedicines[selectedIndex]);
        }
      } else if (e.key === 'Escape' || e.key === 'Tab') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isDropdownVisible, selectedIndex, filteredMedicines, onSelect, onClose]);

  if (!isDropdownVisible) return null;

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-full mt-1 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9999] overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in duration-100"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
        <span>INVENTORY ITEMS ({filteredMedicines.length})</span>
        <span>↑↓ to navigate • Enter to select</span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredMedicines.map((med, idx) => {
          const isSelected = idx === selectedIndex;
          const mrp = med.mrp || med.sellingPrice || med.salePrice || 0;
          const purchasePrice = med.purchasePrice || med.latestPurchasePrice || 0;

          return (
            <div
              key={med.id || idx}
              onClick={() => onSelect(med)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{med.name}</div>
                {med.genericName && (
                  <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                    {med.genericName}
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono text-xs">
                  {formatCurrency(purchasePrice)}
                </div>
                {mrp > 0 && (
                  <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    MRP: {formatCurrency(mrp)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
