import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Search, Plus, Phone, MessageSquare, ArrowUpRight, 
  FileText, Calendar, DollarSign, Download, Filter, Eye, CheckCircle2,
  AlertCircle, ShieldCheck, X, RefreshCw, ChevronRight, Truck, ShoppingCart
} from 'lucide-react';
import { dbSuppliers, dbPartyPayments } from '../lib/db';
import { Supplier, PartyPayment } from '../types';
import { emitToast } from '../contexts/ToastContext';

export const SupplierKhataPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<PartyPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'due' | 'clear'>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // New Supplier Form State
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCompany, setNewSupplierCompany] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierCity, setNewSupplierCity] = useState('Lahore');
  const [newSupplierOpeningBalance, setNewSupplierOpeningBalance] = useState(0);

  // Payment Out Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque'>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Load supplier data
  const loadData = async () => {
    setLoading(true);
    try {
      const allParties = await dbSuppliers.getAll();
      // Filter supplier types (partyType === 'Supplier' or type === 'Supplier')
      const supplierList = allParties.filter(p => 
        p.partyType === 'Supplier' || p.type === 'Supplier' || p.company
      );
      setSuppliers(supplierList);

      const allPayments = await dbPartyPayments.getAll();
      setPayments(allPayments);
    } catch (e) {
      console.error('Error loading supplier khatas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (s.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (s.phone || '').includes(searchTerm) ||
                            (s.city || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const balance = s.balance || 0;
      if (filterType === 'due') return matchesSearch && balance > 0;
      if (filterType === 'clear') return matchesSearch && balance <= 0;
      return matchesSearch;
    });
  }, [suppliers, searchTerm, filterType]);

  // Aggregate metrics
  const totalPayable = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + Math.max(0, s.balance || 0), 0);
  }, [suppliers]);

  const dueSuppliersCount = useMemo(() => {
    return suppliers.filter(s => (s.balance || 0) > 0).length;
  }, [suppliers]);

  // Handle Add Supplier Submit
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      alert('Please enter supplier name.');
      return;
    }

    try {
      const newParty: Supplier = {
        id: `supp_${Date.now()}`,
        name: newSupplierName.trim(),
        company: newSupplierCompany.trim() || newSupplierName.trim(),
        partyType: 'Supplier',
        type: 'Supplier',
        phone: newSupplierPhone.trim(),
        city: newSupplierCity.trim(),
        balance: Number(newSupplierOpeningBalance) || 0,
        openingBalance: Number(newSupplierOpeningBalance) || 0,
        createdAt: new Date().toISOString()
      };

      await dbSuppliers.save(newParty);
      emitToast(`✅ Supplier "${newParty.name}" registered in Khata!`, 'success');
      setIsAddModalOpen(false);
      setNewSupplierName('');
      setNewSupplierCompany('');
      setNewSupplierPhone('');
      setNewSupplierOpeningBalance(0);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to add supplier.');
    }
  };

  // Handle Record Payment (Payment Out)
  const handleRecordPaymentOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const newPayment: PartyPayment = {
        id: `pay_out_${Date.now()}`,
        partyId: selectedSupplier.id,
        partyName: selectedSupplier.name,
        type: 'PAYMENT_OUT',
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        paymentMode: paymentMode,
        notes: paymentNotes.trim(),
        createdAt: new Date().toISOString()
      };

      await dbPartyPayments.save(newPayment);

      // Update supplier payable balance (reduces with payment out)
      const currentBalance = selectedSupplier.balance || 0;
      const updatedBalance = Math.max(0, currentBalance - amount);
      const updatedSupp: Supplier = {
        ...selectedSupplier,
        balance: updatedBalance
      };
      await dbSuppliers.save(updatedSupp);

      emitToast(`💸 Paid PKR ${amount.toLocaleString()} to ${selectedSupplier.name}!`, 'success');
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to record payment out.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto animate-in fade-in duration-150">
      
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Supplier Khatas (Payables &amp; Claims)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage distributor bills, purchase orders, payment out records and returns
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier Khata</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Supplier Payables</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              PKR {totalPayable.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">Pending payment obligations</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Distributors</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {suppliers.length}
            </div>
            <span className="text-[11px] text-purple-600 font-semibold">{dueSuppliersCount} with outstanding claims</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expiry Claims Khata</span>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              Form-7 / DRAP Compatible
            </div>
            <span className="text-[11px] text-slate-400">Direct debit note reconciliation</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search distributor, company, mobile or city..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All ({suppliers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('due')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'due'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Pending Payable ({dueSuppliersCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('clear')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'clear'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Settled (0 Dues)
          </button>
        </div>
      </div>

      {/* Supplier Khatas Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Distributor / Supplier</th>
                <th className="p-3.5">Company / Agency</th>
                <th className="p-3.5">Contact Phone</th>
                <th className="p-3.5">City</th>
                <th className="p-3.5 text-right">Payable Balance</th>
                <th className="p-3.5 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                    <span>Loading supplier ledgers...</span>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No supplier khatas found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Register your pharmaceutical distributors to track bills and payments.</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supp) => {
                  const balance = supp.balance || 0;

                  return (
                    <tr key={supp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-xs">
                            {supp.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span>{supp.name}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-semibold">
                        {supp.company || supp.name}
                      </td>

                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {supp.phone || 'N/A'}
                      </td>

                      <td className="p-3.5 text-slate-500">
                        {supp.city || 'Lahore'}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold">
                        <span className={balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          PKR {balance.toLocaleString()}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Record Payment Out */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplier(supp);
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                            title="Record Payment Out"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Payment Out</span>
                          </button>

                          {/* Purchase Bills / Ledger */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplier(supp);
                              setIsLedgerModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="View Supplier Account History"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. ADD SUPPLIER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Register Distributor Khata</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Supplier / Distributor Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="e.g. Martin Dow Distribution"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Company / Agency Name</label>
                <input
                  type="text"
                  value={newSupplierCompany}
                  onChange={(e) => setNewSupplierCompany(e.target.value)}
                  placeholder="e.g. Abbott / GSK Agency"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Contact Phone</label>
                  <input
                    type="tel"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    placeholder="0321-7654321"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">City</label>
                  <input
                    type="text"
                    value={newSupplierCity}
                    onChange={(e) => setNewSupplierCity(e.target.value)}
                    placeholder="Lahore"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Opening Payable Balance (PKR)</label>
                <input
                  type="number"
                  value={newSupplierOpeningBalance}
                  onChange={(e) => setNewSupplierOpeningBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm"
                >
                  Save Distributor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. RECORD PAYMENT OUT MODAL
      ───────────────────────────────────────────────────────────── */}
      {isPaymentModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  <span>Record Payment Out</span>
                </h3>
                <p className="text-xs text-slate-500">{selectedSupplier.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs">
              <span className="font-bold text-rose-800 dark:text-rose-300">Outstanding Payable Amount:</span>
              <span className="font-black text-sm font-mono text-rose-600 dark:text-rose-400">
                PKR {(selectedSupplier.balance || 0).toLocaleString()}
              </span>
            </div>

            <form onSubmit={handleRecordPaymentOut} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Amount Paid (PKR) *</label>
                <input
                  type="number"
                  required
                  autoFocus
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white font-mono font-bold text-base"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Cash">Cash Handover</option>
                  <option value="Bank Transfer">Bank Transfer (Online)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Notes / Bill Number (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Invoice #2041 settlement"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? 'Recording...' : 'Confirm Payment Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. SUPPLIER ACCOUNT LEDGER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isLedgerModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[88vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Supplier Account Statement</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedSupplier.name} ({selectedSupplier.company || 'Distributor'})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payable Balance</span>
                  <span className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                    PKR {(selectedSupplier.balance || 0).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLedgerModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                Opening Balance: <span className="font-mono font-bold">PKR {(selectedSupplier.openingBalance || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end text-xs shrink-0">
              <button
                type="button"
                onClick={() => setIsLedgerModalOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SupplierKhataPage;
