import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  TrendingUp, DollarSign, ShoppingBag, Award, Users, Calendar, 
  ArrowUpRight, ArrowDownRight, Filter, Download, Printer, Search, 
  Sparkles, CheckCircle2, Star, Target, Zap, Shield, ChevronRight, UserCheck
} from 'lucide-react';
import { Booker, BookerRoleType, Invoice } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { emitToast } from '../../contexts/ToastContext';

interface BookerPerformanceDashboardProps {
  bookers: Booker[];
  invoices?: Invoice[];
  onSelectBooker?: (bookerId: string) => void;
  onOpenNewOrder?: () => void;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316'
];

export const BookerPerformanceDashboard: React.FC<BookerPerformanceDashboardProps> = ({
  bookers,
  invoices = [],
  onSelectBooker,
  onOpenNewOrder
}) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [roleFilter, setRoleFilter] = useState<'ALL' | BookerRoleType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [metricView, setMetricView] = useState<'sales' | 'commission' | 'orders' | 'efficiency'>('sales');

  // Filter bookers
  const filteredBookers = useMemo(() => {
    return bookers.filter(b => {
      if (roleFilter !== 'ALL' && b.roleType !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchArea = b.areaOrRoute?.toLowerCase().includes(q);
        const matchPhone = b.phone?.includes(q);
        if (!matchName && !matchArea && !matchPhone) return false;
      }
      return true;
    });
  }, [bookers, roleFilter, searchQuery]);

  // Key Aggregates
  const performanceKPIs = useMemo(() => {
    const totalStaff = filteredBookers.length;
    const totalSales = filteredBookers.reduce((sum, b) => sum + (Number(b.totalSalesVolume) || 0), 0);
    const totalOrders = filteredBookers.reduce((sum, b) => sum + (Number(b.totalOrdersBooked) || 0), 0);
    const totalCommissionEarned = filteredBookers.reduce((sum, b) => sum + (Number(b.totalCommissionEarned) || 0), 0);
    const totalCommissionPaid = filteredBookers.reduce((sum, b) => sum + (Number(b.totalCommissionPaid) || 0), 0);
    const outstandingBalance = filteredBookers.reduce((sum, b) => sum + (Number(b.currentBalance) || 0), 0);
    const totalTargets = filteredBookers.reduce((sum, b) => sum + (Number(b.salesTarget) || 0), 0);
    
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const overallTargetAchievedPct = totalTargets > 0 ? Math.min(100, Math.round((totalSales / totalTargets) * 100)) : 0;

    // Top performer by sales
    const sortedBySales = [...filteredBookers].sort((a, b) => (b.totalSalesVolume || 0) - (a.totalSalesVolume || 0));
    const topPerformer = sortedBySales[0] || null;

    return {
      totalStaff,
      totalSales,
      totalOrders,
      totalCommissionEarned,
      totalCommissionPaid,
      outstandingBalance,
      avgOrderValue,
      overallTargetAchievedPct,
      topPerformer
    };
  }, [filteredBookers]);

  // Recharts Bar Data: Staff Sales vs Commission
  const staffComparisonData = useMemo(() => {
    return filteredBookers
      .slice(0, 10)
      .map((b) => {
        const target = Number(b.salesTarget) || 100000;
        const sales = Number(b.totalSalesVolume) || 0;
        const commission = Number(b.totalCommissionEarned) || 0;
        const orders = Number(b.totalOrdersBooked) || 0;
        const targetPct = target > 0 ? Math.min(150, Math.round((sales / target) * 100)) : 0;

        return {
          id: b.id,
          name: b.name.length > 14 ? b.name.substring(0, 12) + '...' : b.name,
          fullName: b.name,
          role: b.roleType,
          salesVolume: sales,
          commissionEarned: commission,
          ordersCount: orders,
          targetAmount: target,
          targetPct
        };
      })
      .sort((a, b) => b.salesVolume - a.salesVolume);
  }, [filteredBookers]);

  // Recharts Pie Data: Sales Volume Share by Booker
  const salesShareData = useMemo(() => {
    const total = performanceKPIs.totalSales;
    if (total === 0) return [];
    
    const sorted = [...filteredBookers].sort((a, b) => (b.totalSalesVolume || 0) - (a.totalSalesVolume || 0));
    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);

    const result = top5.map(b => ({
      name: b.name,
      value: Number(b.totalSalesVolume) || 0,
      role: b.roleType
    }));

    if (others.length > 0) {
      const othersTotal = others.reduce((sum, b) => sum + (Number(b.totalSalesVolume) || 0), 0);
      if (othersTotal > 0) {
        result.push({
          name: 'Other Staff',
          value: othersTotal,
          role: 'Multiple' as any
        });
      }
    }

    return result;
  }, [filteredBookers, performanceKPIs.totalSales]);

  // Recharts Timeline Trend: Orders & Sales Frequency Simulation based on timeRange
  const trendTimelineData = useMemo(() => {
    const total = performanceKPIs.totalSales || 250000;
    const orders = performanceKPIs.totalOrders || 45;

    if (timeRange === 'today') {
      const hours = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'];
      return hours.map((h, i) => {
        const factor = [0.08, 0.18, 0.12, 0.15, 0.22, 0.16, 0.09][i];
        return {
          period: h,
          sales: Math.round(total * factor),
          orders: Math.max(1, Math.round(orders * factor)),
          commission: Math.round(total * factor * 0.03)
        };
      });
    }

    if (timeRange === 'week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map((d, i) => {
        const factor = [0.12, 0.14, 0.16, 0.15, 0.18, 0.15, 0.10][i];
        return {
          period: d,
          sales: Math.round(total * factor),
          orders: Math.max(1, Math.round(orders * factor)),
          commission: Math.round(total * factor * 0.03)
        };
      });
    }

    // Month or default
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    return weeks.map((w, i) => {
      const factor = [0.22, 0.28, 0.26, 0.24][i];
      return {
        period: w,
        sales: Math.round(total * factor),
        orders: Math.max(1, Math.round(orders * factor)),
        commission: Math.round(total * factor * 0.03)
      };
    });
  }, [performanceKPIs, timeRange]);

  // Multi-Factor Radar Data for Top 3 Staff Comparison
  const radarComparisonData = useMemo(() => {
    const top3 = [...filteredBookers].sort((a, b) => (b.totalSalesVolume || 0) - (a.totalSalesVolume || 0)).slice(0, 3);
    const maxSales = Math.max(...top3.map(b => b.totalSalesVolume || 1), 1);
    const maxOrders = Math.max(...top3.map(b => b.totalOrdersBooked || 1), 1);

    const categories = [
      { key: 'salesVolume', label: 'Sales Vol' },
      { key: 'ordersCount', label: 'Order Freq' },
      { key: 'targetAchieve', label: 'Target %' },
      { key: 'commissionRate', label: 'Comm. Rate' },
      { key: 'recoveryRate', label: 'Payout Balance' }
    ];

    return categories.map(cat => {
      const item: any = { metric: cat.label };
      top3.forEach((b, idx) => {
        const target = Number(b.salesTarget) || 100000;
        const sales = Number(b.totalSalesVolume) || 0;
        const orders = Number(b.totalOrdersBooked) || 0;
        let score = 50;

        if (cat.key === 'salesVolume') {
          score = Math.round((sales / maxSales) * 100);
        } else if (cat.key === 'ordersCount') {
          score = Math.round((orders / maxOrders) * 100);
        } else if (cat.key === 'targetAchieve') {
          score = target > 0 ? Math.min(100, Math.round((sales / target) * 100)) : 50;
        } else if (cat.key === 'commissionRate') {
          score = Math.min(100, (Number(b.commissionPercentage) || 2.5) * 20);
        } else if (cat.key === 'recoveryRate') {
          const earned = Number(b.totalCommissionEarned) || 1;
          const paid = Number(b.totalCommissionPaid) || 0;
          score = Math.min(100, Math.round((paid / earned) * 100)) || 50;
        }

        item[b.name || `Staff ${idx + 1}`] = Math.max(15, score);
      });
      return item;
    });
  }, [filteredBookers]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Staff Name', 'Role', 'Route/Area', 'Phone', 'Orders Booked', 'Sales Volume (PKR)', 'Commission Earned (PKR)', 'Commission Paid (PKR)', 'Outstanding Balance (PKR)', 'Target (PKR)', 'Achievement %'];
    const rows = filteredBookers.map(b => [
      `"${b.name}"`,
      b.roleType,
      `"${b.areaOrRoute || 'N/A'}"`,
      `"${b.phone || 'N/A'}"`,
      b.totalOrdersBooked || 0,
      b.totalSalesVolume || 0,
      b.totalCommissionEarned || 0,
      b.totalCommissionPaid || 0,
      b.currentBalance || 0,
      b.salesTarget || 0,
      `${b.salesTarget ? Math.round(((b.totalSalesVolume || 0) / b.salesTarget) * 100) : 0}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Booker_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    emitToast('Booker Performance Report exported as CSV successfully!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Enterprise Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0 shadow-inner">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight text-white">Booker &amp; Staff Performance Analytics</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Enterprise Feature
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Compare field order bookers, billers, and salesmen metrics. Track gross sales volume, commission payout liabilities, order booking frequency, and target completion rates with interactive charts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Time Filter */}
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-700">
              {(['today', 'week', 'month', 'year', 'all'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition capitalize cursor-pointer ${
                    timeRange === t 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'today' ? 'Today' : t === 'week' ? 'This Week' : t === 'month' ? 'This Month' : t === 'year' ? 'This Year' : 'All Time'}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="Export report to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="Print Dashboard Report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Sales Volume */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Booker Sales Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {formatCurrency(performanceKPIs.totalSales)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Avg AOV: {formatCurrency(performanceKPIs.avgOrderValue)}</span>
          </div>
        </div>

        {/* Total Orders Booked */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Order Frequency</span>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1.5">
            {performanceKPIs.totalOrders} Orders
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Across {performanceKPIs.totalStaff} staff members
          </div>
        </div>

        {/* Commissions Earned */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Commission Earned</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">
            {formatCurrency(performanceKPIs.totalCommissionEarned)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Paid: {formatCurrency(performanceKPIs.totalCommissionPaid)}
          </div>
        </div>

        {/* Outstanding Commission Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Payable Liability</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
            {formatCurrency(performanceKPIs.outstandingBalance)}
          </div>
          <div className="text-[11px] text-amber-600/80 font-medium mt-0.5">
            Pending Commission Khata
          </div>
        </div>

        {/* Top Performer Spotlight */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 p-4 rounded-2xl shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
            <span>🏆 Top Booker #1</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-white mt-1 truncate">
            {performanceKPIs.topPerformer ? performanceKPIs.topPerformer.name : 'No staff recorded'}
          </div>
          <div className="text-[11px] text-indigo-200 font-semibold mt-0.5 truncate">
            {performanceKPIs.topPerformer ? `${formatCurrency(performanceKPIs.topPerformer.totalSalesVolume || 0)} (${performanceKPIs.topPerformer.totalOrdersBooked || 0} orders)` : 'Register bookers to track'}
          </div>
        </div>
      </div>

      {/* Filter and Metric Switcher Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search booker, area, route..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Roles</option>
            <option value="Booker">Order Booker</option>
            <option value="Biller">Counter Biller</option>
            <option value="Salesman">Field Salesman</option>
            <option value="Delivery Rider">Delivery Rider</option>
            <option value="Recovery Officer">Recovery Officer</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500 mr-1 hidden sm:inline">Visual Metric:</span>
          {(['sales', 'commission', 'orders'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetricView(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                metricView === m
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {m === 'sales' ? 'Sales Volume' : m === 'commission' ? 'Commissions' : 'Order Count'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Staff Performance Comparison BarChart (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Staff Comparison: {metricView === 'sales' ? 'Sales Volume vs Target' : metricView === 'commission' ? 'Commission Earned' : 'Order Booking Frequency'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comparative ranking across top staff members
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Showing top {staffComparisonData.length} bookers
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#94a3b8' }} 
                  tickFormatter={(val) => metricView === 'orders' ? val : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    if (name === 'Sales Volume (Rs)' || name === 'Target (Rs)' || name === 'Commission Earned (Rs)') {
                      return [formatCurrency(Number(value)), name];
                    }
                    return [value, name];
                  }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                {metricView === 'sales' && (
                  <>
                    <Bar dataKey="salesVolume" name="Sales Volume (Rs)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="targetAmount" name="Target (Rs)" fill="#64748b" radius={[6, 6, 0, 0]} opacity={0.4} />
                  </>
                )}

                {metricView === 'commission' && (
                  <Bar dataKey="commissionEarned" name="Commission Earned (Rs)" fill="#10b981" radius={[6, 6, 0, 0]} />
                )}

                {metricView === 'orders' && (
                  <Bar dataKey="ordersCount" name="Orders Booked" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Sales Volume Market Share PieChart (1 Col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Sales Contribution Share
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Percentage of total business generated per booker
            </p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            {salesShareData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {salesShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Sales Volume']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400">No sales recorded yet</div>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {salesShareData.slice(0, 4).map((item, idx) => {
              const pct = performanceKPIs.totalSales > 0 ? Math.round((item.value / performanceKPIs.totalSales) * 100) : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate max-w-[140px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
                    <span className="text-[10px] text-slate-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secondary Charts: Order Frequency Timeline & Multi-Factor Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline AreaChart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Booking Volume &amp; Order Frequency Trend ({timeRange.toUpperCase()})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pacing of orders and sales velocity across time intervals
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  formatter={(val: any, name: any) => [formatCurrency(Number(val)), name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="sales" name="Sales Volume" stroke="#3b82f6" fillOpacity={1} fill="url(#salesGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="commission" name="Commission Generated" stroke="#10b981" fillOpacity={1} fill="url(#commGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multi-Factor Radar Chart (Top 3 Staff) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              Staff Efficiency Radar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-dimensional evaluation of top performers
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {filteredBookers.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarComparisonData}>
                  <PolarGrid stroke="#334155" opacity={0.3} />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} />
                  {filteredBookers.slice(0, 3).map((b, idx) => (
                    <Radar
                      key={b.id}
                      name={b.name}
                      dataKey={b.name}
                      stroke={COLORS[idx % COLORS.length]}
                      fill={COLORS[idx % COLORS.length]}
                      fillOpacity={0.25}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '11px' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400">No staff data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Staff Leaderboard & Granular Performance Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Staff Performance Leaderboard &amp; Commission Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked by total sales volume and conversion efficiency
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {filteredBookers.length} staff member{filteredBookers.length > 1 ? 's' : ''} listed
          </span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Booker / Staff</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Area / Route</th>
                <th className="py-2.5 px-3 text-center">Orders</th>
                <th className="py-2.5 px-3 text-right">Sales Volume</th>
                <th className="py-2.5 px-3 text-right">Commission Earned</th>
                <th className="py-2.5 px-3 text-right">Current Balance</th>
                <th className="py-2.5 px-3 text-center">Target Progress</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredBookers
                .sort((a, b) => (b.totalSalesVolume || 0) - (a.totalSalesVolume || 0))
                .map((booker, index) => {
                  const target = Number(booker.salesTarget) || 0;
                  const sales = Number(booker.totalSalesVolume) || 0;
                  const targetAchieved = target > 0 ? Math.min(100, Math.round((sales / target) * 100)) : 0;

                  return (
                    <tr 
                      key={booker.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                      onClick={() => onSelectBooker?.(booker.id)}
                    >
                      <td className="py-3 px-3 font-mono font-bold">
                        {index === 0 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 text-xs font-black">🥇 1</span>}
                        {index === 1 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-400 text-xs font-black">🥈 2</span>}
                        {index === 2 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-700 text-xs font-black">🥉 3</span>}
                        {index > 2 && <span className="text-slate-400 text-xs font-semibold pl-2">#{index + 1}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{booker.name}</span>
                          {booker.status === 'Active' && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />}
                        </div>
                        <div className="text-[11px] text-slate-400">{booker.phone || 'No phone'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-200 dark:border-indigo-800/60">
                          {booker.roleType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                        {booker.areaOrRoute || 'All Routes'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {booker.totalOrdersBooked || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(booker.totalSalesVolume || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        {formatCurrency(booker.totalCommissionEarned || 0)}
                        <span className="block text-[10px] text-slate-400 font-normal">({booker.commissionPercentage || 2.5}%)</span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-600 dark:text-amber-400 font-mono">
                        {formatCurrency(booker.currentBalance || 0)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-24 mx-auto space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{targetAchieved}%</span>
                            <span>{target > 0 ? `${(target/1000).toFixed(0)}k` : '-'}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${targetAchieved >= 100 ? 'bg-emerald-500' : targetAchieved >= 60 ? 'bg-indigo-500' : 'bg-amber-500'}`} 
                              style={{ width: `${targetAchieved}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBooker?.(booker.id);
                          }}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <span>Khata</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {filteredBookers.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-400">
                    No booker or biller staff found matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
