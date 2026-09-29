import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, User, Building2, Phone, Mail, MapPin, CreditCard, 
  DollarSign, FileText, Calendar, Printer, Share2, Plus, 
  ArrowDownLeft, ArrowUpRight, CheckCircle2, ShieldCheck, 
  Clock, Hash, Percent, Edit3, MessageSquare, Send, Download 
} from 'lucide-react';
import { Party, Invoice, PartyPayment, PurchaseOrder } from '../../types';
import { dbInvoices, dbPurchaseOrders, dbPartyPayments, dbSuppliers } from '../../lib/db';
import { RecordPaymentModal } from './RecordPaymentModal';
import { WhatsAppReminderModal } from './WhatsAppReminderModal';
import { StatementPrintModal } from './StatementPrintModal';
import { emitToast } from '../../contexts/ToastContext';

interface PartyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  onPartyUpdated?: (updated: Party) => void;
}

export const PartyDetailModal: React.FC<PartyDetailModalProps> = ({
  isOpen,
  onClose,
  party,
  onPartyUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'ledger' | 'transactions'>('ledger');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [payments, setPayments] = useState<PartyPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Editable Profile Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState<number>(0);
  const [editPaymentTerms, setEditPaymentTerms] = useState('Due on Receipt');
  const [editNtn, setEditNtn] = useState('');

  const isSupplier = party?.partyType === 'Supplier' || party?.type === 'Supplier';

  useEffect(() => {
    if (!party) return;
    setEditName(party.name || '');
    setEditCompany(party.company || '');
    setEditPhone(party.phone || '');
    setEditEmail(party.email || '');
    setEditAddress(party.address || '');
    setEditCity(party.city || 'Lahore');
    setEditCategory(party.category || (isSupplier ? 'Distributor' : 'Retail Walk-in'));
    setEditCreditLimit(party.creditLimit || 50000);
    setEditPaymentTerms(party.paymentTerms || 'Net 15 Days');
    setEditNtn(party.ntn || party.taxNumber || '');
  }, [party, isSupplier]);

  // Load Transactions & Ledger Entries
  const loadLedgerData = async () => {
    if (!party) return;
    setIsLoading(true);
    try {
      const [allInvs, allPurchases, allPayments] = await Promise.all([
        dbInvoices.getAll(),
        dbPurchaseOrders.getAll(),
        dbPartyPayments.getAll()
      ]);

      const partyInvs = (allInvs || []).filter(inv => 
        inv.partyId === party.id || 
        inv.customerName?.toLowerCase() === party.name.toLowerCase() ||
        (party.phone && inv.customerPhone === party.phone)
      );

      const partyPurchases = (allPurchases || []).filter(p => 
        p.supplierId === party.id ||
        p.partyId === party.id ||
        p.supplierName?.toLowerCase() === party.name.toLowerCase()
      );

      const partyPays = (allPayments || []).filter(pay => 
        pay.partyId === party.id ||
        pay.partyName?.toLowerCase() === party.name.toLowerCase()
      );

      setInvoices(partyInvs);
      setPurchases(partyPurchases);
      setPayments(partyPays);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && party) {
      loadLedgerData();
    }
  }, [isOpen, party]);

  // Build Comprehensive Date-Sorted Ledger with Running Balance
  const ledgerEntries = useMemo(() => {
    if (!party) return [];

    type LedgerRow = {
      id: string;
      date: string;
      timestamp: number;
      type: string;
      refNumber: string;
      debit: number; // For customer: new sale; For supplier: payment made to them
      credit: number; // For customer: payment received; For supplier: inward purchase bill
      balance: number;
      notes?: string;
    };

    const rows: LedgerRow[] = [];

    // Opening Balance
    const openBal = party.openingBalance || 0;
    if (openBal !== 0) {
      rows.push({
        id: 'opening-bal',
        date: party.createdAt ? party.createdAt.slice(0, 10) : '2026-01-01',
        timestamp: party.createdAt ? new Date(party.createdAt).getTime() : 0,
        type: 'Opening Balance',
        refNumber: 'INITIAL',
        debit: openBal > 0 ? openBal : 0,
        credit: openBal < 0 ? Math.abs(openBal) : 0,
        balance: openBal,
        notes: 'Initial opening balance khata'
      });
    }

    if (isSupplier) {
      // Supplier purchases increase liability (Credit)
      purchases.forEach(p => {
        const amt = Number(p.totalAmount ?? (p as any).total ?? 0);
        rows.push({
          id: p.id,
          date: p.date ? p.date.slice(0, 10) : 'N/A',
          timestamp: p.date ? new Date(p.date).getTime() : Date.now(),
          type: 'Purchase Bill (Inward)',
          refNumber: p.orderNumber || p.billNumber || p.id.slice(0, 8),
          debit: 0,
          credit: amt,
          balance: 0,
          notes: `${p.items?.length || 0} items inward`
        });
      });

      // Payments made to supplier reduce liability (Debit)
      payments.forEach(pay => {
        rows.push({
          id: pay.id,
          date: pay.date ? pay.date.slice(0, 10) : 'N/A',
          timestamp: pay.date ? new Date(pay.date).getTime() : Date.now(),
          type: 'Payment Out (Cash / Bank)',
          refNumber: pay.referenceNumber || pay.receiptNumber || pay.id.slice(0, 8),
          debit: pay.amount,
          credit: 0,
          balance: 0,
          notes: pay.notes || pay.paymentMode
        });
      });
    } else {
      // Customer sales increase receivable (Debit)
      invoices.forEach(inv => {
        const amt = Number(inv.grandTotal ?? (inv as any).totalAmount ?? 0);
        rows.push({
          id: inv.id,
          date: inv.date ? inv.date.slice(0, 10) : 'N/A',
          timestamp: inv.date ? new Date(inv.date).getTime() : Date.now(),
          type: 'Sale Invoice',
          refNumber: inv.invoiceNumber || inv.id.slice(0, 8),
          debit: amt,
          credit: 0,
          balance: 0,
          notes: `${inv.items?.length || 0} items billed`
        });
      });

      // Payments received from customer reduce receivable (Credit)
      payments.forEach(pay => {
        rows.push({
          id: pay.id,
          date: pay.date ? pay.date.slice(0, 10) : 'N/A',
          timestamp: pay.date ? new Date(pay.date).getTime() : Date.now(),
          type: 'Cash In (Payment Received)',
          refNumber: pay.referenceNumber || pay.receiptNumber || pay.id.slice(0, 8),
          debit: 0,
          credit: pay.amount,
          balance: 0,
          notes: pay.notes || pay.paymentMode
        });
      });
    }

    // Sort chronologically
    rows.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate Running Balance
    let running = 0;
    rows.forEach(r => {
      if (isSupplier) {
        running += (r.credit - r.debit);
      } else {
        running += (r.debit - r.credit);
      }
      r.balance = running;
    });

    return rows;
  }, [party, isSupplier, invoices, purchases, payments]);

  const currentBalance = useMemo(() => {
    if (ledgerEntries.length === 0) return party?.balance || 0;
    return ledgerEntries[ledgerEntries.length - 1].balance;
  }, [ledgerEntries, party]);

  const handleSaveProfile = async () => {
    if (!party) return;
    try {
      const updatedParty: Party = {
        ...party,
        name: editName.trim(),
        company: editCompany.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        city: editCity.trim(),
        category: editCategory,
        creditLimit: Number(editCreditLimit) || 0,
        paymentTerms: editPaymentTerms,
        ntn: editNtn.trim(),
        taxNumber: editNtn.trim(),
        updatedAt: new Date().toISOString()
      };

      await dbSuppliers.save(updatedParty);
      setIsEditingProfile(false);
      emitToast(`Party profile for ${updatedParty.name} updated successfully!`, 'success');
      if (onPartyUpdated) {
        onPartyUpdated(updatedParty);
      }
    } catch (e: any) {
      alert(`Failed to save profile: ${e.message}`);
    }
  };

  if (!isOpen || !party) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800 dark:text-slate-100">
          
          {/* Top Banner Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md ${
                isSupplier ? 'bg-indigo-600' : 'bg-blue-600'
              }`}>
                {isSupplier ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white truncate">
                    {party.name}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                    isSupplier 
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' 
                      : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                  }`}>
                    {party.category || (isSupplier ? 'Supplier' : 'Customer')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                  <span>{party.company || party.phone || 'Account Profile'}</span>
                  {party.city && <span>• {party.city}</span>}
                </p>
              </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{isSupplier ? 'Record Payment Out' : 'Record Payment In'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Send WhatsApp Khata Statement"
              >
                <MessageSquare className="w-4 h-4 text-emerald-300" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Print Account Statement"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print Statement</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Balance & Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 shrink-0 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="text-[10.5px] text-slate-400 font-bold block">CURRENT KHATA BALANCE</span>
              <span className={`text-base font-black font-mono ${
                currentBalance > 0 
                  ? (isSupplier ? 'text-rose-600' : 'text-blue-600') 
                  : 'text-emerald-600'
              }`}>
                Rs {Math.abs(currentBalance).toLocaleString()}
                <span className="text-[10px] ml-1 font-bold text-slate-400">
                  {currentBalance > 0 ? (isSupplier ? '(Payable)' : '(Receivable)') : '(Settled)'}
                </span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="text-[10.5px] text-slate-400 font-bold block">CREDIT LIMIT</span>
              <span className="text-sm font-black font-mono text-slate-800 dark:text-white">
                Rs {(party.creditLimit || 50000).toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="text-[10.5px] text-slate-400 font-bold block">PAYMENT TERMS</span>
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                {party.paymentTerms || 'Net 15 Days'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="text-[10.5px] text-slate-400 font-bold block">TOTAL TRANSACTIONS</span>
              <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                {ledgerEntries.length} Records
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Statement & Live Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Full Profile & Financial Settings</span>
            </button>
          </div>

          {/* Tab 1: Statement & Live Ledger Table */}
          {activeTab === 'ledger' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10.5px] border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Transaction Type</th>
                      <th className="py-2.5 px-3">Ref / Invoice #</th>
                      <th className="py-2.5 px-3 text-right">Debit (Rs)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Rs)</th>
                      <th className="py-2.5 px-3 text-right">Balance (Rs)</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No transactions recorded yet for this party.
                        </td>
                      </tr>
                    ) : (
                      ledgerEntries.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">{row.date}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{row.type}</td>
                          <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400 font-bold">{row.refNumber}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-200">
                            {row.debit > 0 ? `Rs ${row.debit.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                            {row.credit > 0 ? `Rs ${row.credit.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                            Rs {row.balance.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-[140px]">{row.notes || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Profile & Financial Settings */}
          {activeTab === 'profile' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Party Identity & Financial Khata Configuration
                </h3>
                {!isEditingProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold disabled:opacity-80"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">Company / Store Name</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 disabled:opacity-80"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">Phone / Mobile</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 disabled:opacity-80 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled={!isEditingProfile}
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 disabled:opacity-80"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">Category / Group</label>
                  <select
                    disabled={!isEditingProfile}
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 disabled:opacity-80"
                  >
                    {isSupplier ? (
                      <>
                        <option value="Distributor">Distributor</option>
                        <option value="Pharma Company">Pharma Company</option>
                        <option value="Local Vendor">Local Vendor</option>
                        <option value="Wholesale Agency">Wholesale Agency</option>
                      </>
                    ) : (
                      <>
                        <option value="Retail Walk-in">Retail Walk-in</option>
                        <option value="Wholesaler">Wholesaler</option>
                        <option value="Hospital / Clinic">Hospital / Clinic</option>
                        <option value="Doctor / Prescriber">Doctor / Prescriber</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">NTN / STRN Tax ID</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={editNtn}
                    onChange={(e) => setEditNtn(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 disabled:opacity-80 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">Credit Limit (Rs)</label>
                  <input
                    type="number"
                    disabled={!isEditingProfile}
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 disabled:opacity-80 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">Default Payment Terms</label>
                  <select
                    disabled={!isEditingProfile}
                    value={editPaymentTerms}
                    onChange={(e) => setEditPaymentTerms(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 disabled:opacity-80"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 7 Days">Net 7 Days</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">City / Location</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 disabled:opacity-80"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-slate-500 font-bold block mb-1">Delivery & Billing Address</label>
                  <textarea
                    disabled={!isEditingProfile}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 disabled:opacity-80"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
            <div className="text-slate-400">
              ID: <span className="font-mono text-slate-600 dark:text-slate-300">{party.id.slice(0, 12)}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
            >
              Close
            </button>
          </div>

        </div>
      </div>

      {/* Sub Modals */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        party={party}
        onPaymentSaved={() => {
          loadLedgerData();
          emitToast('Payment transaction recorded successfully!', 'success');
        }}
      />

      <WhatsAppReminderModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        party={party}
      />

      <StatementPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        party={party}
        invoices={invoices}
        purchaseOrders={purchases}
        payments={payments}
      />
    </>
  );
};
