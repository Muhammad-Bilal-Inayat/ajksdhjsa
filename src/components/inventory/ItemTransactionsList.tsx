import React, { useState, useMemo, useEffect } from 'react';
import { 
  MoreVertical, Eye, Share2, Edit3, Trash2, Search, 
  FileSpreadsheet, Filter, AlertTriangle 
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { Medicine } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { canUserEditTransaction, canUserDeleteTransaction } from '../../utils/rolePermissions';
import { TransactionDetailModal, ItemTransactionData } from './TransactionDetailModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { dbInvoices, dbPurchaseOrders, dbAuditLogs, dbMedicines } from '../../lib/db';
import { useNavigate } from 'react-router-dom';

interface ItemTransactionsListProps {
  transactions: ItemTransactionData[];
  activeMedicine: Medicine | null;
  searchTransaction?: string;
  onSearchChange?: (val: string) => void;
  onExportExcel?: () => void;
  onRefresh?: () => void;
  onOpenAdjustModal?: () => void;
  showToast?: (msg: string) => void;
}

export const ItemTransactionsList: React.FC<ItemTransactionsListProps> = ({
  transactions,
  activeMedicine,
  searchTransaction: externalSearch,
  onSearchChange: externalOnSearchChange,
  onExportExcel,
  onRefresh,
  onOpenAdjustModal,
  showToast
}) => {
  const { currentUser, userProfile, activeUser, tenant } = useAuth();
  const navigate = useNavigate();

  // Internal search state fallback if not provided externally
  const [internalSearch, setInternalSearch] = useState('');
  const searchVal = externalSearch !== undefined ? externalSearch : internalSearch;
  const handleSearchChange = (val: string) => {
    if (externalOnSearchChange) {
      externalOnSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'ADJUSTMENT'>('ALL');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedTxForView, setSelectedTxForView] = useState<ItemTransactionData | null>(null);
  const [txToDelete, setTxToDelete] = useState<ItemTransactionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveMenuId(null);
    };
    if (activeMenuId) {
      document.addEventListener('click', handleDocumentClick);
    }
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [activeMenuId]);

  // Strict permission guards using /server context and user roles
  const effectiveUser = activeUser || userProfile || currentUser;
  const canEditTransaction = useMemo(() => {
    return canUserEditTransaction(effectiveUser, tenant);
  }, [effectiveUser, tenant]);

  const canDeleteTransaction = useMemo(() => {
    return canUserDeleteTransaction(effectiveUser, tenant);
  }, [effectiveUser, tenant]);

  // Filter transactions based on search and type filter
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.name.toLowerCase().includes(searchVal.toLowerCase()) ||
        tx.type.toLowerCase().includes(searchVal.toLowerCase()) ||
        (tx.refNumber && tx.refNumber.toLowerCase().includes(searchVal.toLowerCase()));

      if (!matchesSearch) return false;

      if (transactionTypeFilter === 'SALE') return tx.type === 'Sale' || tx.type === 'Sale Return';
      if (transactionTypeFilter === 'PURCHASE') return tx.type === 'Purchase' || tx.type === 'Purchase Return';
      if (transactionTypeFilter === 'ADJUSTMENT') return tx.type === 'Adjustment' || tx.type === 'Opening Stock' || tx.type === 'Stock Adjustment';

      return true;
    });
  }, [transactions, searchVal, transactionTypeFilter]);

  // 1. View Details Handler
  const handleViewTransaction = (tx: ItemTransactionData) => {
    setActiveMenuId(null);
    setSelectedTxForView(tx);
  };

  // 2. Share via WhatsApp Handler
  const handleShareWhatsApp = (tx: ItemTransactionData) => {
    setActiveMenuId(null);
    const msg = [
      `🧾 *MBI INVENTRA - TRANSACTION VOUCHER*`,
      `------------------------------------`,
      `*Type:* ${tx.type}`,
      `*Ref:* ${tx.refNumber || 'N/A'}`,
      `*Date:* ${formatDate(tx.date)}`,
      `*Party / Source:* ${tx.name}`,
      `*Product:* ${activeMedicine?.name || 'Inventory Item'}`,
      `*Quantity:* ${tx.quantity} ${activeMedicine?.unit || 'PCS'}`,
      `*Price / Unit:* Rs ${tx.pricePerUnit.toFixed(2)}`,
      `*Total Amount:* Rs ${tx.totalAmount.toFixed(2)}`,
      `*Status:* ${tx.status}`,
      tx.notes ? `*Notes:* ${tx.notes}` : '',
      `------------------------------------`,
      `_Generated via MBI INVENTRA Cloud ERP_`
    ].filter(Boolean).join('\n');

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    if (showToast) {
      showToast('Opening WhatsApp with transaction voucher...');
    }
  };

  // 3. Edit Transaction Handler
  const handleEditTransaction = (tx: ItemTransactionData) => {
    setActiveMenuId(null);
    if (!canEditTransaction) {
      if (showToast) showToast('Editing is restricted by admin policy.');
      return;
    }

    if (tx.type === 'Sale' || tx.type === 'Sale Return') {
      navigate('/sale');
      if (showToast) showToast(`Navigating to POS billing for ${tx.refNumber || 'sale invoice'}...`);
    } else if (tx.type === 'Purchase' || tx.type === 'Purchase Return') {
      navigate('/purchases');
      if (showToast) showToast(`Navigating to Inward Purchases for ${tx.refNumber || 'purchase order'}...`);
    } else {
      if (onOpenAdjustModal) {
        onOpenAdjustModal();
      } else if (showToast) {
        showToast('Opening Stock Adjustment modal for this item...');
      }
    }
  };

  // 4. Delete Transaction Handler
  const handleDeleteTransaction = (tx: ItemTransactionData) => {
    setActiveMenuId(null);
    if (!canDeleteTransaction) {
      if (showToast) showToast('Transaction deletion is restricted by admin policy.');
      return;
    }
    setTxToDelete(tx);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      // Find and delete matching transaction from db
      if (txToDelete.id.startsWith('inv-')) {
        const parts = txToDelete.id.split('-');
        const invoiceId = parts[1];
        if (invoiceId) {
          await dbInvoices.delete(invoiceId);
        }
      } else if (txToDelete.id.startsWith('po-')) {
        const parts = txToDelete.id.split('-');
        const poId = parts[1];
        if (poId) {
          await dbPurchaseOrders.delete(poId);
        }
      } else if (txToDelete.id.startsWith('log-')) {
        const logId = txToDelete.id.replace('log-', '');
        if (logId) {
          await dbAuditLogs.delete(logId);
        }
      }

      if (showToast) {
        showToast(`Transaction ${txToDelete.refNumber || txToDelete.type} deleted successfully.`);
      }

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      if (showToast) {
        showToast('Failed to delete transaction.');
      }
    } finally {
      setIsDeleting(false);
      setTxToDelete(null);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
            TRANSACTIONS
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {filteredTransactions.length} records
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Transaction Search */}
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchVal}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Excel Export Icon */}
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              title="Export Transactions to Excel (.xlsx)"
              className="p-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 rounded-lg transition active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Type Chips */}
      <div className="flex items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => setTransactionTypeFilter('ALL')}
          className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
            transactionTypeFilter === 'ALL'
              ? 'bg-slate-800 text-white dark:bg-blue-600'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setTransactionTypeFilter('SALE')}
          className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
            transactionTypeFilter === 'SALE'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Sales
        </button>
        <button
          type="button"
          onClick={() => setTransactionTypeFilter('PURCHASE')}
          className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
            transactionTypeFilter === 'PURCHASE'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Purchases
        </button>
        <button
          type="button"
          onClick={() => setTransactionTypeFilter('ADJUSTMENT')}
          className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
            transactionTypeFilter === 'ADJUSTMENT'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Adjustments
        </button>
      </div>

      {/* Transactions Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-3.5 py-2.5">
                <div className="flex items-center gap-1">
                  <span>TYPE</span>
                  <Filter className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-3.5 py-2.5">
                <div className="flex items-center gap-1">
                  <span>NAME</span>
                  <Filter className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-3.5 py-2.5">
                <div className="flex items-center gap-1">
                  <span>↓ DATE</span>
                  <Filter className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-3.5 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  <span>QUANTITY</span>
                  <Filter className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-3.5 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  <span>PRICE/ UNIT</span>
                  <Filter className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-3.5 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span>STATUS</span>
                  <Filter className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="px-2 py-2.5 text-right w-12"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {filteredTransactions.map((tx) => {
              const isPurchase = tx.type === 'Purchase' || tx.type === 'Purchase Return';
              const isSale = tx.type === 'Sale' || tx.type === 'Sale Return';

              const dotColor = isPurchase
                ? 'bg-rose-400'
                : isSale
                ? 'bg-blue-500'
                : 'bg-amber-500';

              return (
                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  {/* TYPE */}
                  <td className="px-3.5 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span className="font-bold text-slate-900 dark:text-slate-100">{tx.type}</span>
                      {tx.refNumber && (
                        <span className="text-[10px] text-slate-400 font-mono">({tx.refNumber})</span>
                      )}
                    </div>
                  </td>

                  {/* NAME */}
                  <td className="px-3.5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                    <div className="truncate max-w-[220px] uppercase">
                      {tx.name}
                    </div>
                  </td>

                  {/* DATE */}
                  <td className="px-3.5 py-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                    {formatDate(tx.date)}
                  </td>

                  {/* QUANTITY */}
                  <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {isSale ? (
                      <span className="text-blue-700 dark:text-blue-400">{tx.quantity}</span>
                    ) : (
                      <span>{tx.quantity}</span>
                    )}
                  </td>

                  {/* PRICE / UNIT */}
                  <td className="px-3.5 py-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    Rs {tx.pricePerUnit.toFixed(2)}
                  </td>

                  {/* STATUS */}
                  <td className="px-3.5 py-3 text-center whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        tx.status === 'Paid' || tx.status === 'Completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                          : tx.status === 'Partial'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>

                  {/* 3-DOTS ACTION DROPDOWN */}
                  <td className="px-2 py-3 text-right">
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === tx.id ? null : tx.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="Transaction Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === tx.id && (
                        <div 
                          className="absolute right-0 bottom-full mb-1 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-xs font-semibold space-y-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* 1. View Details (Always Allowed) */}
                          <button
                            type="button"
                            onClick={() => handleViewTransaction(tx)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                            <span>View Details</span>
                          </button>

                          {/* 2. Share via WhatsApp (Always Allowed) */}
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(tx)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors text-left cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share on WhatsApp</span>
                          </button>

                          {/* 3. Edit Transaction (GATED by /server switch & user permissions) */}
                          {canEditTransaction && (
                            <button
                              type="button"
                              onClick={() => handleEditTransaction(tx)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors text-left cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Bill / Voucher</span>
                            </button>
                          )}

                          {/* 4. Delete Transaction (GATED by /server switch & user permissions) */}
                          {canDeleteTransaction && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left border-t border-slate-100 dark:border-slate-800 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Record</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs text-slate-400">
                  No transactions recorded for this item yet. Click <strong>ADJUST ITEM</strong> or add a Sale/Purchase to create transactions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Details Modal */}
      {selectedTxForView && (
        <TransactionDetailModal
          isOpen={Boolean(selectedTxForView)}
          onClose={() => setSelectedTxForView(null)}
          transaction={selectedTxForView}
          medicine={activeMedicine}
          onShareWhatsApp={handleShareWhatsApp}
        />
      )}

      {/* Confirm Delete Modal */}
      {txToDelete && (
        <ConfirmDeleteModal
          isOpen={Boolean(txToDelete)}
          title="Delete Transaction Record?"
          message="Are you sure you want to delete this transaction voucher? This action will remove the record permanently."
          itemName={`${txToDelete.type} (${txToDelete.refNumber || txToDelete.name})`}
          confirmLabel="Yes, Delete Record"
          isDeleting={isDeleting}
          onConfirm={handleConfirmDeleteTransaction}
          onClose={() => setTxToDelete(null)}
        />
      )}
    </div>
  );
};
