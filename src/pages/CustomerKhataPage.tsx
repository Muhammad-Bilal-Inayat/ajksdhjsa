import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Plus, Phone, MessageSquare, ArrowDownLeft, 
  FileText, Calendar, DollarSign, Download, Filter, Eye, CheckCircle2,
  AlertCircle, ShieldCheck, X, RefreshCw, ChevronRight, User
} from 'lucide-react';
import { dbSuppliers, dbPartyPayments, dbInvoices } from '../lib/db';
import { Supplier, PartyPayment, Invoice } from '../types';
import { emitToast } from '../contexts/ToastContext';

export const CustomerKhataPage: React.FC = () => {
  const [customers, setCustomers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<PartyPayment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'due' | 'clear'>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Supplier | null>(null);

  // New Customer Form State
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCity, setNewCustomerCity] = useState('Lahore');
  const [newCustomerCreditLimit, setNewCustomerCreditLimit] = useState(25000);
  const [newCustomerOpeningBalance, setNewCustomerOpeningBalance] = useState(0);

  // Payment In Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque'>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Load customer data
  const loadData = async () => {
    setLoading(true);
    try {
      const allParties = await dbSuppliers.getAll();
      // Filter customer types (partyType === 'Customer' or !partyType or type === 'Customer')
      const customerList = allParties.filter(p => 
        (p.partyType === 'Customer' || p.type === 'Customer' || (!p.partyType && !p.type))
      );
      setCustomers(customerList);

      const allPayments = await dbPartyPayments.getAll();
      setPayments(allPayments);

      const allInvoices = await dbInvoices.getAll();
      setInvoices(allInvoices);
    } catch (e) {
      console.error('Error loading customer khatas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (c.phone || '').includes(searchTerm) ||
                            (c.city || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const balance = c.balance || 0;
      if (filterType === 'due') return matchesSearch && balance > 0;
      if (filterType === 'clear') return matchesSearch && balance <= 0;
      return matchesSearch;
    });
  }, [customers, searchTerm, filterType]);

  // Aggregate metrics
  const totalUdhar = useMemo(() => {
    return customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
  }, [customers]);

  const dueCustomersCount = useMemo(() => {
    return customers.filter(c => (c.balance || 0) > 0).length;
  }, [customers]);

  // Handle Add Customer Submit
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      alert('Please enter customer name.');
      return;
    }

    try {
      const newParty: Supplier = {
        id: `cust_${Date.now()}`,
        name: newCustomerName.trim(),
        partyType: 'Customer',
        type: 'Customer',
        phone: newCustomerPhone.trim(),
        city: newCustomerCity.trim(),
        creditLimit: Number(newCustomerCreditLimit) || 0,
        balance: Number(newCustomerOpeningBalance) || 0,
        openingBalance: Number(newCustomerOpeningBalance) || 0,
        createdAt: new Date().toISOString()
      };

      await dbSuppliers.save(newParty);
      emitToast(`✅ Customer "${newParty.name}" added to Khata!`, 'success');
      setIsAddModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerOpeningBalance(0);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to add customer.');
    }
  };

  // Handle Record Payment (Cash In)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const newPayment: PartyPayment = {
        id: `pay_${Date.now()}`,
        partyId: selectedCustomer.id,
        partyName: selectedCustomer.name,
        type: 'PAYMENT_IN',
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        paymentMode: paymentMode,
        notes: paymentNotes.trim(),
        createdAt: new Date().toISOString()
      };

      await dbPartyPayments.save(newPayment);

      // Update customer balance (Debit Udhar reduces with Cash In)
      const currentBalance = selectedCustomer.balance || 0;
      const updatedBalance = Math.max(0, currentBalance - amount);
      const updatedCust: Supplier = {
        ...selectedCustomer,
        balance: updatedBalance
      };
      await dbSuppliers.save(updatedCust);

      emitToast(`💰 Received PKR ${amount.toLocaleString()} from ${selectedCustomer.name}!`, 'success');
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to record payment in khata.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Generate WhatsApp Statement Link
  const handleSendWhatsAppStatement = (cust: Supplier) => {
    const balance = cust.balance || 0;
    const msg = `Salam ${cust.name}! Your current pharmacy Khata balance with us is PKR ${balance.toLocaleString()}. Thank you for choosing us!`;
    const phoneClean = (cust.phone || '').replace(/[^0-9]/g, '');
    const targetPhone = phoneClean.startsWith('92') ? phoneClean : phoneClean.startsWith('0') ? '92' + phoneClean.slice(1) : '92' + phoneClean;
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Customer transactions for Ledger Modal
  const customerLedgerEntries = useMemo(() => {
    if (!selectedCustomer) return [];
    
    // Invoices for this customer
    const custInvoices = invoices.filter(inv => 
      inv.customerName?.toLowerCase() === selectedCustomer.name.toLowerCase() ||
      inv.partyId === selectedCustomer.id ||
      inv.customerPhone === selectedCustomer.phone
    ).map(inv => ({
      id: inv.id,
      date: inv.date || inv.createdAt?.split('T')[0] || 'N/A',
      type: 'Invoice Sale',
      ref: inv.invoiceNumber || inv.id,
      debit: inv.grandTotal || (inv as any).totalAmount || (inv as any).total || 0,
      credit: 0,
      notes: `${inv.items?.length || 0} item(s)`
    }));

    // Payments for this customer (strictly manual receipts)
    const custPayments = payments.filter(p => {
      const isAuto = p.isAuto || 
        (p.notes || '').toLowerCase().includes('auto payment') || 
        (p.receiptNumber || '').startsWith('REC-INV-') ||
        ((p.referenceNumber || '').toUpperCase().startsWith('INV-') && !(p.notes && !p.notes.toLowerCase().includes('sale')));
      if (isAuto) return false;

      return (
        p.partyId === selectedCustomer.id || 
        p.partyName?.toLowerCase() === selectedCustomer.name.toLowerCase()
      );
    }).map(p => ({
      id: p.id,
      date: p.date || p.createdAt?.split('T')[0] || 'N/A',
      type: 'Cash In (Payment)',
      ref: p.referenceNumber || p.id,
      debit: 0,
      credit: p.amount,
      notes: p.notes || p.paymentMode
    }));

    const combined = [...custInvoices, ...custPayments].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return combined;
  }, [selectedCustomer, invoices, payments]);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto animate-in fade-in duration-150">
      
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Customer Khatas (Udhar Ledgers)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage credit balances, WhatsApp reminders, and payment recoveries
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer Khata</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Customer Udhar</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              PKR {totalUdhar.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">Total outstanding balance</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Khata Customers</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {customers.length}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">{dueCustomersCount} with active dues</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Recovery</span>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              1-Click Billing Sharing
            </div>
            <span className="text-[11px] text-slate-400">Instant PDF &amp; SMS balance notice</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
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
            placeholder="Search by customer name, mobile or city..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All ({customers.length})
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
            Has Dues ({dueCustomersCount})
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
            Clear (0 Dues)
          </button>
        </div>
      </div>

      {/* Customer Khatas Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Customer Details</th>
                <th className="p-3.5">Mobile / WhatsApp</th>
                <th className="p-3.5">City</th>
                <th className="p-3.5">Credit Limit</th>
                <th className="p-3.5 text-right">Udhar Balance</th>
                <th className="p-3.5 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading customer ledgers...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No customer khatas found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Add your first customer to start tracking udhar balances.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const balance = cust.balance || 0;
                  const limit = cust.creditLimit || 0;
                  const isOverLimit = limit > 0 && balance > limit;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                            {cust.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span>{cust.name}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono">
                        {cust.phone || 'N/A'}
                      </td>

                      <td className="p-3.5 text-slate-500">
                        {cust.city || 'Lahore'}
                      </td>

                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {limit > 0 ? `PKR ${limit.toLocaleString()}` : 'No Limit'}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold">
                        <span className={balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          PKR {balance.toLocaleString()}
                        </span>
                        {isOverLimit && (
                          <span className="block text-[10px] text-amber-500 font-sans font-bold">Over Limit</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Record Payment (Cash In) */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                            title="Record Payment Cash In"
                          >
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>Cash In</span>
                          </button>

                          {/* WhatsApp Statement */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppStatement(cust)}
                            className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                            title="Send WhatsApp Khata Statement"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Detailed Transaction Ledger */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsLedgerModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="View Full Ledger History"
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
          1. ADD CUSTOMER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Add Customer to Khata</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Haji Muhammad Aslam"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Mobile / WhatsApp</label>
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">City</label>
                  <input
                    type="text"
                    value={newCustomerCity}
                    onChange={(e) => setNewCustomerCity(e.target.value)}
                    placeholder="Lahore"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Credit Limit (PKR)</label>
                  <input
                    type="number"
                    value={newCustomerCreditLimit}
                    onChange={(e) => setNewCustomerCreditLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Opening Udhar (PKR)</label>
                  <input
                    type="number"
                    value={newCustomerOpeningBalance}
                    onChange={(e) => setNewCustomerOpeningBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white font-mono"
                  />
                </div>
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. RECORD PAYMENT (CASH IN) MODAL
      ───────────────────────────────────────────────────────────── */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>Record Cash In (Payment)</span>
                </h3>
                <p className="text-xs text-slate-500">{selectedCustomer.name}</p>
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
              <span className="font-bold text-rose-800 dark:text-rose-300">Current Outstanding Udhar:</span>
              <span className="font-black text-sm font-mono text-rose-600 dark:text-rose-400">
                PKR {(selectedCustomer.balance || 0).toLocaleString()}
              </span>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Amount Received (PKR) *</label>
                <input
                  type="number"
                  required
                  autoFocus
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 5000"
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
                  <option value="Cash">Cash Counter</option>
                  <option value="Bank Transfer">Bank Transfer (Online)</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Partial recovery for previous week"
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? 'Recording...' : 'Confirm Cash In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. DETAILED TRANSACTION LEDGER MODAL
      ───────────────────────────────────────────────────────────── */}
      {isLedgerModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[88vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Ledger Top Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Customer Ledger &amp; Khata Statement</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedCustomer.name} • {selectedCustomer.phone || 'No phone'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance Due</span>
                  <span className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                    PKR {(selectedCustomer.balance || 0).toLocaleString()}
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

            {/* Ledger Table */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Transaction Type</th>
                    <th className="p-2.5">Reference / Notes</th>
                    <th className="p-2.5 text-right text-rose-600">Debit (Udhar)</th>
                    <th className="p-2.5 text-right text-emerald-600">Credit (Paid)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customerLedgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No transactions recorded for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    customerLedgerEntries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{entry.date}</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{entry.type}</td>
                        <td className="p-2.5 text-slate-500">{entry.ref} ({entry.notes})</td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {entry.debit > 0 ? `PKR ${entry.debit.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {entry.credit > 0 ? `PKR ${entry.credit.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleSendWhatsAppStatement(selectedCustomer)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send WhatsApp Statement</span>
              </button>

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

export default CustomerKhataPage;
