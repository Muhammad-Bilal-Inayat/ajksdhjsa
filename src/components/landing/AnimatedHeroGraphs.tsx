import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, Activity, ShieldCheck, Zap, DollarSign, 
  Clock, Package, CheckCircle2, AlertTriangle, Sparkles, Percent
} from 'lucide-react';

const HOURLY_SALES_DATA = [
  { time: '09:00', sales: 12400, bills: 18, profit: 3100 },
  { time: '11:00', sales: 28900, bills: 42, profit: 7200 },
  { time: '13:00', sales: 45200, bills: 65, profit: 11300 },
  { time: '15:00', sales: 68400, bills: 98, profit: 17100 },
  { time: '17:00', sales: 94500, bills: 135, profit: 23600 },
  { time: '19:00', sales: 122800, bills: 178, profit: 30700 },
  { time: '21:00', sales: 143200, bills: 208, profit: 35800 },
];

const FEFO_EXPIRY_DATA = [
  { range: '0-30 Days', critical: 12, safe: 88, value: 48000 },
  { range: '31-60 Days', critical: 24, safe: 176, value: 96000 },
  { range: '61-90 Days', critical: 45, safe: 355, value: 185000 },
  { range: '90+ Days', critical: 0, safe: 1240, value: 890000 },
];

const MARGIN_DATA = [
  { category: 'Antibiotics', margin: 28, revenue: 45000 },
  { category: 'Cardiology', margin: 22, revenue: 38000 },
  { category: 'OTC & Pain', margin: 34, revenue: 29000 },
  { category: 'Surgicals', margin: 42, revenue: 18000 },
  { category: 'Baby Care', margin: 18, revenue: 13200 },
];

export const AnimatedHeroGraphs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'fefo' | 'margins'>('sales');
  
  // Continuous Live Ticker States (animating every 3 seconds)
  const [salesTicker, setSalesTicker] = useState(142850);
  const [billsTicker, setBillsTicker] = useState(2035);
  const [velocityTicker, setVelocityTicker] = useState(47);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSalesTicker(prev => prev + Math.floor(Math.random() * 350) + 120);
      setBillsTicker(prev => prev + Math.floor(Math.random() * 2) + 1);
      setVelocityTicker(prev => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1);
        return Math.max(42, Math.min(54, next));
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-4 sm:p-6 text-slate-900 dark:text-white backdrop-blur-xl transition-all select-none">
      
      {/* Top Live Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" />
            Live POS Engine Telemetry
          </span>
        </div>

        {/* Interactive Graph Sub-Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Real-Time Sales Flow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fefo')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeTab === 'fefo'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            FEFO Expiry Radar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('margins')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeTab === 'margins'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            P&L Margins
          </button>
        </div>
      </div>

      {/* Dynamic 3-Metric Live Ticker Row (switches metrics based on activeTab) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {activeTab === 'sales' && (
          <>
            {/* Sales Metric 1 */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Live Sales Today</p>
                <p className={`text-xl sm:text-2xl font-black font-mono transition-colors duration-500 ${
                  pulse ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-900 dark:text-white'
                }`}>
                  Rs {salesTicker.toLocaleString()}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Sales Metric 2 */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Live Bills Cleared</p>
                <p className={`text-xl sm:text-2xl font-black font-mono transition-colors duration-500 ${
                  pulse ? 'text-blue-600 dark:text-blue-300' : 'text-slate-900 dark:text-white'
                }`}>
                  {billsTicker.toLocaleString()}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Sales Metric 3 */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Peak Velocity</p>
                <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-300">
                  {velocityTicker} <span className="text-xs text-slate-500 dark:text-slate-300 font-sans font-normal">Bills/hr</span>
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </>
        )}

        {activeTab === 'fefo' && (
          <>
            {/* FEFO Metric 1 */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Critical Expiry (&lt;30d)</p>
                <p className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                  12 Batches
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            {/* FEFO Metric 2 */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Safe Tracked Batches</p>
                <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  1,859 Batches
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            {/* FEFO Metric 3 */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Monitored Stock Value</p>
                <p className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                  Rs 1,219,000
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </>
        )}

        {activeTab === 'margins' && (
          <>
            {/* Margins Metric 1 */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Highest Margin Category</p>
                <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  42% <span className="text-xs text-slate-500 dark:text-slate-300 font-sans font-normal">(Surgicals)</span>
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
            </div>

            {/* Margins Metric 2 */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Average Store Margin</p>
                <p className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                  28.8%
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Margins Metric 3 */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between transition-colors">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Estimated Net Profit</p>
                <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-300">
                  Rs 35,800
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Interactive Graph Display */}
      <div className="h-64 sm:h-72 w-full pt-2">
        {activeTab === 'sales' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={HOURLY_SALES_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#ffffff' }}
                formatter={(value: any, name: any) => [
                  `Rs ${Number(value).toLocaleString()}`, 
                  name === 'sales' ? 'Gross Sales' : 'Net Profit'
                ]}
              />
              <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
              <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'fefo' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={FEFO_EXPIRY_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
              <XAxis dataKey="range" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#ffffff' }}
                formatter={(value: any, name: any) => [
                  `${value} Batches`, 
                  name === 'critical' ? 'Action Required' : 'Safe Batches'
                ]}
              />
              <Bar dataKey="safe" fill="#3b82f6" radius={[6, 6, 0, 0]} name="safe" />
              <Bar dataKey="critical" fill="#f59e0b" radius={[6, 6, 0, 0]} name="critical" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'margins' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={MARGIN_DATA} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
              <XAxis type="number" stroke="#64748b" fontSize={11} unit="%" />
              <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#ffffff' }}
                formatter={(value: any) => [`${value}% Margin`, 'Profit Margin']}
              />
              <Bar dataKey="margin" fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Feature Callout */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-300 font-medium">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero-Latency Nano-Second Engine Active</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-300">
          <span>Sync Ping: 0.04ms</span>
          <span>•</span>
          <span>Offline Ready: 100%</span>
        </div>
      </div>

    </div>
  );
};

export default AnimatedHeroGraphs;
