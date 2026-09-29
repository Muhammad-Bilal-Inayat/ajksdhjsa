import React, { useCallback, useMemo } from 'react';
import { useTransactionDock } from '../../contexts/TransactionDockContext';
import { AddSaleModal } from '../sales/AddSaleModal';
import { AddPurchaseModal } from '../purchases/AddPurchaseModal';
import { Invoice, PurchaseOrder } from '../../types';
import { FileSpreadsheet, Package, Maximize2, X } from 'lucide-react';

export const TransactionHostModalLayer: React.FC = () => {
  const { 
    drafts, 
    minimizeTransaction, 
    restoreTransaction, 
    closeTransaction, 
    updateDraftSummary 
  } = useTransactionDock();

  const handleSaleSaved = useCallback((draftId: string, savedInvoice: Invoice) => {
    closeTransaction(draftId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mbi-local-db-change'));
      window.dispatchEvent(new CustomEvent('mbi-transaction-saved', { detail: { type: 'sale', invoice: savedInvoice } }));
    }
  }, [closeTransaction]);

  const handlePurchaseSaved = useCallback((draftId: string, savedOrder?: PurchaseOrder) => {
    closeTransaction(draftId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mbi-local-db-change'));
      window.dispatchEvent(new CustomEvent('mbi-transaction-saved', { detail: { type: 'purchase', order: savedOrder } }));
    }
  }, [closeTransaction]);

  const handleMinimizeToggle = useCallback((draftId: string, minimized: boolean) => {
    if (minimized) {
      minimizeTransaction(draftId);
    } else {
      restoreTransaction(draftId);
    }
  }, [minimizeTransaction, restoreTransaction]);

  const handleSummaryUpdate = useCallback((draftId: string, summary: any) => {
    updateDraftSummary(draftId, summary);
  }, [updateDraftSummary]);

  // Consolidate all minimized Sales and Purchases into unified list
  const minimizedTasks = useMemo(() => {
    return drafts.filter(d => d.isOpen && d.isMinimized).map(d => {
      const isSale = 
        d.category === 'Sale' || 
        d.category === 'Sale Return' || 
        d.category === 'Estimate' || 
        d.category === 'Sale Order' || 
        d.category === 'Delivery Challan';

      let title = d.title;
      if (d.partyName && d.partyName.trim()) {
        title = `${isSale ? 'Sale' : 'Purchase'} - ${d.partyName}`;
      } else if (!title || title === d.category) {
        title = isSale ? 'Sale - Cash' : 'Purchase - PUR-1';
      }

      return {
        id: d.id,
        type: isSale ? ('sale' as const) : ('purchase' as const),
        title,
        category: d.category,
        partyName: d.partyName,
        amount: d.amount
      };
    });
  }, [drafts]);

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div id="mbi-transaction-host-modals" className="pointer-events-auto">
      {/* 1. Modal Components Layer */}
      {drafts.map((draft) => {
        const isSaleCategory = 
          draft.category === 'Sale' || 
          draft.category === 'Sale Return' || 
          draft.category === 'Estimate' || 
          draft.category === 'Sale Order' || 
          draft.category === 'Delivery Challan';

        const isPurchaseCategory = 
          draft.category === 'Purchase' || 
          draft.category === 'Purchase Return' || 
          draft.category === 'Purchase Order';

        if (isSaleCategory) {
          return (
            <AddSaleModal
              key={draft.id}
              isOpen={draft.isOpen}
              isDockMinimized={draft.isMinimized}
              dockDraftId={draft.id}
              defaultTransactionType={draft.category as any}
              initialInvoice={draft.initialData as Invoice || null}
              onClose={() => closeTransaction(draft.id)}
              onSaveSuccess={(inv) => handleSaleSaved(draft.id, inv)}
              onMinimizeChange={(minimized) => handleMinimizeToggle(draft.id, minimized)}
              onSummaryChange={(summary) => handleSummaryUpdate(draft.id, summary)}
            />
          );
        }

        if (isPurchaseCategory) {
          return (
            <AddPurchaseModal
              key={draft.id}
              isOpen={draft.isOpen}
              isDockMinimized={draft.isMinimized}
              dockDraftId={draft.id}
              transactionType={draft.category as any}
              initialOrder={draft.initialData as PurchaseOrder || null}
              onClose={() => closeTransaction(draft.id)}
              onSaved={(ord) => handlePurchaseSaved(draft.id, ord)}
              onMinimizeChange={(minimized) => handleMinimizeToggle(draft.id, minimized)}
              onSummaryChange={(summary) => handleSummaryUpdate(draft.id, summary)}
            />
          );
        }

        return null;
      })}

      {/* 2. Single Razor-Sharp Active Tasks Dock (Zero Duplicate Background) */}
      {minimizedTasks && minimizedTasks.length > 0 && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-800/90 max-w-[95vw] overflow-x-auto select-none pointer-events-auto">
          
          {/* Counter Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-slate-300 shrink-0 border-r border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Active Tasks {minimizedTasks.length}/5</span>
          </div>

          {/* Task Pills on ONE Single Layer */}
          <div className="flex items-center gap-2 shrink-0">
            {minimizedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => restoreTransaction(task.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                  task.type === 'sale'
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'bg-rose-600 text-white hover:bg-rose-500'
                }`}
              >
                {task.type === 'sale' ? (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                ) : (
                  <Package className="w-3.5 h-3.5" />
                )}
                
                <span className="truncate max-w-[140px]">{task.title}</span>

                {/* Restore Window Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    restoreTransaction(task.id);
                  }}
                  className="p-1 hover:text-white rounded-md hover:bg-white/20 transition-all cursor-pointer"
                  title="Restore Window"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>

                {/* Close Task Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTransaction(task.id);
                  }}
                  className="p-1 hover:text-white rounded-md hover:bg-white/20 transition-all cursor-pointer"
                  title="Close Task"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
};
