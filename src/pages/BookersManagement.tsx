import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCheck, Plus, Search, Filter, Phone, Mail, MapPin, 
  DollarSign, TrendingUp, Award, FileText, CheckCircle2, ChevronRight, 
  Trash2, Edit3, X, Printer, Share2, Sparkles, ShoppingBag, ArrowUpRight,
  ShieldCheck, AlertCircle, Calendar, RefreshCw, BarChart2, Check, Clock, User, BarChart3, Lock
} from 'lucide-react';
import { Booker, BookerCommissionTransaction, BookerRoleType, Invoice } from '../types';
import { BookerService } from '../lib/bookerService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { emitToast } from '../contexts/ToastContext';
import { formatCurrency } from '../lib/utils';
import { useTransactionDock } from '../contexts/TransactionDockContext';
import { BookerPerformanceDashboard } from '../components/bookers/BookerPerformanceDashboard';
import { getCurrentPlan, isPlanAtLeast } from '../lib/planFeatureManager';

export const BookersManagement: React.FC = () => {
  const { tenant, tenantId, userProfile, activeRole } = useAuth();
  const { settings } = useSettings();
  const { openTransaction } = useTransactionDock();

  const currentPlan = (tenant as any)?.plan || (userProfile as any)?.plan || getCurrentPlan(tenantId || tenant?.id);
  const isEnterprise = isPlanAtLeast(currentPlan, 'ENTERPRISE') || activeRole === 'Primary Admin' || (userProfile as any)?.isPrimaryOwner;

  const [activeTab, setActiveTab] = useState<'performance' | 'directory'>('performance');
  const [bookers, setBookers] = useState<Booker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Selected Booker for in-depth Ledger / Progress view
  const [selectedBookerId, setSelectedBookerId] = useState<string | null>(null);
  const [bookerTransactions, setBookerTransactions] = useState<BookerCommissionTransaction[]>([]);
  const [bookerInvoices, setBookerInvoices] = useState<Invoice[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingBooker, setEditingBooker] = useState<Booker | null>(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutMode, setPayoutMode] = useState<'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque'>('Cash');
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Booker>>({
    name: '',
    roleType: 'Booker',
    phone: '',
    email: '',
    cnic: '',
    address: '',
    areaOrRoute: '',
    commissionPercentage: 2.5,
    salesTarget: 500000,
    currentBalance: 0,
    status: 'Active',
    notes: ''
  });

  const loadBookersData = async () => {
    setLoading(true);
    try {
      const data = await BookerService.getBookers();
      setBookers(data);
      if (data.length > 0 && !selectedBookerId) {
        setSelectedBookerId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load bookers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookersData();

    const handleUpdate = () => {
      loadBookersData();
      if (selectedBookerId) {
        loadBookerDetails(selectedBookerId);
      }
    };
    window.addEventListener('mbi-bookers-updated', handleUpdate);
    return () => window.removeEventListener('mbi-bookers-updated', handleUpdate);
  }, []);

  const loadBookerDetails = async (id: string) => {
    setIsLoadingDetails(true);
    try {
      const details = await BookerService.getBookerDetails(id);
      setBookerTransactions(details.transactions);
      setBookerInvoices(details.recentInvoices);
    } catch (err) {
      console.error('Failed to load booker details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedBookerId) {
      loadBookerDetails(selectedBookerId);
    }
  }, [selectedBookerId]);

  const activeSelectedBooker = useMemo(() => {
    return bookers.find(b => b.id === selectedBookerId) || bookers[0] || null;
  }, [bookers, selectedBookerId]);

  const filteredBookers = useMemo(() => {
    return bookers.filter(b => {
      if (selectedRoleFilter !== 'ALL' && b.roleType !== selectedRoleFilter) return false;
      if (selectedStatusFilter !== 'ALL' && b.status !== selectedStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchPhone = b.phone?.toLowerCase().includes(q);
        const matchRoute = b.areaOrRoute?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchRoute) return false;
      }
      return true;
    });
  }, [bookers, selectedRoleFilter, selectedStatusFilter, searchQuery]);

  // High level overview aggregate KPIs
  const overviewStats = useMemo(() => {
    const totalBookers = bookers.length;
    const totalOrders = bookers.reduce((acc, b) => acc + (b.totalOrdersBooked || 0), 0);
    const totalSales = bookers.reduce((acc, b) => acc + (b.totalSalesVolume || 0), 0);
    const totalEarned = bookers.reduce((acc, b) => acc + (b.totalCommissionEarned || 0), 0);
    const totalBalance = bookers.reduce((acc, b) => acc + (b.currentBalance || 0), 0);

    return {
      totalBookers,
      totalOrders,
      totalSales,
      totalEarned,
      totalBalance
    };
  }, [bookers]);

  const handleOpenAdd = () => {
    setEditingBooker(null);
    setFormData({
      name: '',
      roleType: 'Booker',
      phone: '',
      email: '',
      cnic: '',
      address: '',
      areaOrRoute: '',
      commissionPercentage: 2.5,
      salesTarget: 500000,
      currentBalance: 0,
      status: 'Active',
      notes: ''
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (booker: Booker, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBooker(booker);
    setFormData({
      ...booker
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveBooker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      emitToast('Please enter the Booker / Biller Name', 'error');
      return;
    }

    try {
      const saved = await BookerService.saveBooker({
        ...formData,
        id: editingBooker ? editingBooker.id : undefined
      });
      emitToast(`Booker "${saved.name}" saved successfully!`, 'success');
      setIsAddEditModalOpen(false);
      await loadBookersData();
      setSelectedBookerId(saved.id);
    } catch (err) {
      emitToast('Failed to save booker record', 'error');
    }
  };

  const handleDeleteBooker = async (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove Booker "${name}"?`)) return;

    const ok = await BookerService.deleteBooker(id);
    if (ok) {
      emitToast(`Booker "${name}" removed.`, 'info');
      await loadBookersData();
      if (selectedBookerId === id) {
        setSelectedBookerId(null);
      }
    }
  };

  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedBooker) return;
    if (payoutAmount <= 0) {
      emitToast('Please enter a valid payout amount', 'error');
      return;
    }

    try {
      const tx = await BookerService.recordPayout(
        activeSelectedBooker.id,
        payoutAmount,
        payoutMode,
        payoutRef,
        payoutNotes
      );
      if (tx) {
        emitToast(`Commission Payout of Rs. ${payoutAmount.toLocaleString()} recorded!`, 'success');
        setIsPayoutModalOpen(false);
        setPayoutAmount(0);
        setPayoutRef('');
        setPayoutNotes('');
        await loadBookersData();
        await loadBookerDetails(activeSelectedBooker.id);
      }
    } catch (err) {
      emitToast('Failed to record payout', 'error');
    }
  };

  const handleShareWhatsApp = (booker: Booker) => {
    const text = `*MBI INVENTRA — Booker Commission & Khata Statement*\n` +
      `👤 *Booker:* ${booker.name} (${booker.roleType})\n` +
      `📍 *Route / Area:* ${booker.areaOrRoute || 'General'}\n` +
      `📦 *Total Orders Booked:* ${booker.totalOrdersBooked || 0}\n` +
      `💰 *Total Sales Generated:* Rs. ${(booker.totalSalesVolume || 0).toLocaleString()}\n` +
      `✨ *Commission Rate:* ${booker.commissionPercentage}%\n` +
      `💵 *Commission Earned:* Rs. ${(booker.totalCommissionEarned || 0).toLocaleString()}\n` +
      `✅ *Commission Paid:* Rs. ${(booker.totalCommissionPaid || 0).toLocaleString()}\n` +
      `🛑 *Current Payable Balance:* Rs. ${(booker.currentBalance || 0).toLocaleString()}\n\n` +
      `Generated on ${new Date().toLocaleDateString('en-PK')} via MBI Inventra Enterprise ERP.`;

    const phone = (booker.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('0') ? '92' + phone.slice(1) : phone;
    const url = `https://wa.me/${cleanPhone || ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!isEnterprise) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in pb-16">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white border border-indigo-500/30 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Users className="w-7 h-7" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>💎 ENTERPRISE PLATINUM ONLY</span>
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Order Bookers &amp; Field Sales Force Management
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Order Booking app, field salesmen route allocation, live commission settlement khatas, and performance analytics are available exclusively on the <strong>Enterprise Plan</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Field Bookers &amp; Billers</span>
              </div>
              <p className="text-[11px] text-slate-400">Register unlimited market salesmen and assign territory routes.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Automated Commission Khata</span>
              </div>
              <p className="text-[11px] text-slate-400">Auto-calculate sales commission % and track payout vouchers.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Live Sales Analytics</span>
              </div>
              <p className="text-[11px] text-slate-400">Real-time target vs actual sales charts and WhatsApp statement export.</p>
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
            <a
              href="#pricing"
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Upgrade to Enterprise Plan</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <span className="text-xs text-slate-400">Current Plan: {currentPlan}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-slate-800 pb-16">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-6 rounded-2xl shadow-xl border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/30 border border-indigo-400/30 rounded-xl text-indigo-300">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">Order Bookers & Billers Management</h1>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                  💎 ENTERPRISE PRO
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Track field salesmen orders, route performance, individual khatas, and commission settlement
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Booker / Biller</span>
          </button>
        </div>
      </div>

      {/* Navigation Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'performance'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Booker Performance Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Booker Directory &amp; Khatas ({bookers.length})</span>
          </button>
        </div>

        <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
          Enterprise Plan • Real-time Recharts &amp; Khata Sync
        </span>
      </div>

      {/* TAB 1: Booker Performance Dashboard */}
      {activeTab === 'performance' && (
        <BookerPerformanceDashboard
          bookers={bookers}
          onSelectBooker={(bookerId) => {
            setSelectedBookerId(bookerId);
            setActiveTab('directory');
          }}
          onOpenNewOrder={() => {
            openTransaction('Sale');
          }}
        />
      )}

      {/* TAB 2: Directory & Ledger View */}
      {activeTab === 'directory' && (
        <>
          {/* Aggregate Overview KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-[#131d33] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sales Force</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            {overviewStats.totalBookers}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active field agents</div>
        </div>

        <div className="bg-white dark:bg-[#131d33] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Orders Booked</div>
          <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1 font-mono">
            {overviewStats.totalOrders}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total market orders</div>
        </div>

        <div className="bg-white dark:bg-[#131d33] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Sales Generated</div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300 mt-1 font-mono truncate">
            Rs {overviewStats.totalSales.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Gross billing value</div>
        </div>

        <div className="bg-white dark:bg-[#131d33] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Commission Earned</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 font-mono truncate">
            Rs {overviewStats.totalEarned.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total accrued incentive</div>
        </div>

        <div className="bg-white dark:bg-[#131d33] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 lg:col-span-1">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Payable Balance</div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300 mt-1 font-mono truncate">
            Rs {overviewStats.totalBalance.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Unsettled commission</div>
        </div>
      </div>

      {/* Main Split Interface: Left List + Right Comprehensive Ledger & Progress Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Bookers Directory List */}
        <div className="lg:col-span-4 space-y-3">
          
          <div className="bg-white dark:bg-[#131d33] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            
            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search booker, phone, route..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <select
                  value={selectedRoleFilter}
                  onChange={e => setSelectedRoleFilter(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                >
                  <option value="ALL">All Roles</option>
                  <option value="Booker">Order Bookers</option>
                  <option value="Biller">Billers</option>
                  <option value="Booker and Biller">Booker & Biller</option>
                </select>

                <select
                  value={selectedStatusFilter}
                  onChange={e => setSelectedStatusFilter(e.target.value)}
                  className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                >
                  <option value="ALL">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading sales force...</div>
              ) : filteredBookers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No bookers found. Click <strong>+ Add Booker</strong> to register your first agent.
                </div>
              ) : (
                filteredBookers.map(b => {
                  const isSelected = selectedBookerId === b.id;
                  const targetPercent = b.salesTarget && b.salesTarget > 0 
                    ? Math.min(100, Math.round(((b.totalSalesVolume || 0) / b.salesTarget) * 100))
                    : 0;

                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBookerId(b.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer select-none space-y-2 ${
                        isSelected 
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20 shadow-xs' 
                          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {b.name}
                            </h3>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {b.roleType}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                            {b.phone && <span>📞 {b.phone}</span>}
                            {b.areaOrRoute && <span>• 📍 {b.areaOrRoute}</span>}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-xs font-black text-rose-600 dark:text-rose-400">
                            Rs {(b.currentBalance || 0).toLocaleString()}
                          </div>
                          <div className="text-[9px] text-slate-400">Commission Due</div>
                        </div>
                      </div>

                      {/* Mini Target Progress Bar */}
                      {b.salesTarget && b.salesTarget > 0 ? (
                        <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">Target: Rs {b.salesTarget.toLocaleString()}</span>
                            <span className="font-bold text-blue-600">{targetPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${targetPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                              style={{ width: `${targetPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

        {/* Right Column: Active Booker Performance, Details & Live Khata Ledger */}
        <div className="lg:col-span-8 space-y-4">
          
          {activeSelectedBooker ? (
            <>
              {/* Profile Card */}
              <div className="bg-white dark:bg-[#131d33] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 border border-blue-500/20 flex items-center justify-center font-black text-sm">
                        {activeSelectedBooker.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{activeSelectedBooker.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            {activeSelectedBooker.status}
                          </span>
                        </h2>
                        <p className="text-xs text-slate-500">
                          Role: <strong className="text-slate-700 dark:text-slate-300">{activeSelectedBooker.roleType}</strong> • Commission: <strong className="text-blue-600">{activeSelectedBooker.commissionPercentage}%</strong> • Territory: <strong className="text-slate-700 dark:text-slate-300">{activeSelectedBooker.areaOrRoute || 'All Routes'}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openTransaction('Sale')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Book New Order</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPayoutAmount(activeSelectedBooker.currentBalance || 0);
                        setIsPayoutModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Pay Commission</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(activeSelectedBooker)}
                      title="Share Statement on WhatsApp"
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl transition-all cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(activeSelectedBooker, e)}
                      title="Edit Booker Info"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteBooker(activeSelectedBooker.id, activeSelectedBooker.name, e)}
                      title="Delete Booker"
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Individual Booker Metric Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-slate-500">Orders Booked</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
                      {activeSelectedBooker.totalOrdersBooked || 0}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-blue-600">Total Sales Vol.</div>
                    <div className="text-base font-black text-blue-700 dark:text-blue-300 font-mono mt-0.5 truncate">
                      Rs {(activeSelectedBooker.totalSalesVolume || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-emerald-600">Total Commission</div>
                    <div className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5 truncate">
                      Rs {(activeSelectedBooker.totalCommissionEarned || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-rose-600">Net Payable</div>
                    <div className="text-base font-black text-rose-700 dark:text-rose-300 font-mono mt-0.5 truncate">
                      Rs {(activeSelectedBooker.currentBalance || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

              </div>

              {/* Booker Live Khata / Commission Transactions Ledger */}
              <div className="bg-white dark:bg-[#131d33] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Khata Ledger & Order Booking History
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                    {bookerTransactions.length} Transactions
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Party / Customer</th>
                        <th className="py-2.5 px-3">Bill / Ref #</th>
                        <th className="py-2.5 px-3 text-right">Order Amount</th>
                        <th className="py-2.5 px-3 text-right">Commission</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {isLoadingDetails ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">Loading ledger...</td>
                        </tr>
                      ) : bookerTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No transactions recorded yet for this booker. Orders created with this booker assigned will auto-appear here.
                          </td>
                        </tr>
                      ) : (
                        bookerTransactions.map(t => {
                          const isPayout = t.type === 'PAYOUT';

                          return (
                            <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                {new Date(t.date).toLocaleDateString('en-PK')}
                              </td>
                              <td className="py-2.5 px-3 font-bold">
                                {isPayout ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <span>💸 Payout</span>
                                  </span>
                                ) : (
                                  <span className="text-blue-600 font-bold flex items-center gap-1">
                                    <span>📦 Order Booking</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                {t.partyName || 'Counter Customer'}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                                {t.invoiceNumber || t.referenceNo || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                {t.saleAmount > 0 ? `Rs ${t.saleAmount.toLocaleString()}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black">
                                <span className={isPayout ? 'text-rose-600' : 'text-emerald-600'}>
                                  {isPayout ? `-Rs ${t.commissionAmount.toLocaleString()}` : `+Rs ${t.commissionAmount.toLocaleString()}`}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isPayout ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {t.status || 'Recorded'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Booker Selected</h3>
              <p className="text-xs text-slate-400">Select a booker from the left list to view their live khata and progress dashboard.</p>
            </div>
          )}

        </div>

      </div>
      </>
      )}

      {/* Add / Edit Booker Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {editingBooker ? 'Edit Booker / Biller Details' : 'Register New Order Booker / Biller'}
              </h3>
              <button onClick={() => setIsAddEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBooker} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Bilal"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Role Type</label>
                  <select
                    value={formData.roleType || 'Booker'}
                    onChange={e => setFormData({ ...formData, roleType: e.target.value as BookerRoleType })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="Booker">Order Booker</option>
                    <option value="Biller">Biller</option>
                    <option value="Booker and Biller">Booker & Biller</option>
                    <option value="Delivery Staff">Delivery Staff</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Commission %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 2.5"
                    value={formData.commissionPercentage || 0}
                    onChange={e => setFormData({ ...formData, commissionPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="0300-xxxxxxx"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">CNIC (Optional)</label>
                  <input
                    type="text"
                    placeholder="35202-xxxxxxx-x"
                    value={formData.cnic || ''}
                    onChange={e => setFormData({ ...formData, cnic: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Route / Territory Assigned</label>
                <input
                  type="text"
                  placeholder="e.g. Saddar / Gulberg / Clinic Line"
                  value={formData.areaOrRoute || ''}
                  onChange={e => setFormData({ ...formData, areaOrRoute: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Monthly Sales Target (PKR)</label>
                <input
                  type="number"
                  placeholder="500000"
                  value={formData.salesTarget || 0}
                  onChange={e => setFormData({ ...formData, salesTarget: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-md"
                >
                  {editingBooker ? 'Update Booker' : 'Save Booker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Commission Modal */}
      {isPayoutModalOpen && activeSelectedBooker && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Record Commission Payout</h3>
                <p className="text-[11px] text-slate-500">Pay to: <strong>{activeSelectedBooker.name}</strong></p>
              </div>
              <button onClick={() => setIsPayoutModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayout} className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Current Balance Due</div>
                <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Rs {(activeSelectedBooker.currentBalance || 0).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payout Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payoutAmount || ''}
                  onChange={e => setPayoutAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black font-mono text-base text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Payment Method</label>
                <select
                  value={payoutMode}
                  onChange={e => setPayoutMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Cash">Cash Counter</option>
                  <option value="Bank Transfer">Bank Transfer / Raast</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Reference / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-98218 / Cash Voucher"
                  value={payoutRef}
                  onChange={e => setPayoutRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-md"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
