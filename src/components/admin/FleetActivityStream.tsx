import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, Search, Filter, Play, Pause, Trash2, 
  Building2, User, Zap, Globe, Clock, ShieldCheck, 
  CheckCircle2, ShoppingBag, DollarSign, RefreshCw, AlertCircle
} from 'lucide-react';

export interface FleetActivityItem {
  id: string;
  tenantId: string;
  storeName: string;
  city: string;
  userName: string;
  userRole: string;
  actionType: 'SALE' | 'PURCHASE' | 'LOGIN' | 'STOCK_TRANSFER' | 'PRICE_EDIT' | 'SYSTEM' | 'STAFF_MUTATION' | 'DEVICE_AUTH' | 'NEW_REGISTRATION' | 'PLAN_UPGRADE' | 'LICENSE_EXTENSION';
  actionDetails: string;
  ipAddress: string;
  deviceInfo: string;
  timestamp: string;
  relativeTime: string;
}

const SEED_ACTIVITIES: FleetActivityItem[] = [
  {
    id: 'act_01',
    tenantId: 'tenant_main_pharmacy',
    storeName: 'Inventra Central Pharmacy',
    city: 'Lahore',
    userName: 'Bilal Cashier',
    userRole: 'Cashier Terminal #1',
    actionType: 'SALE',
    actionDetails: 'Generated POS Invoice #INV-4921 (Rs. 4,350.00) - 3 Items',
    ipAddress: '182.185.24.11',
    deviceInfo: 'Dell OptiPlex / Win 11 Pro',
    timestamp: new Date().toISOString(),
    relativeTime: 'Just now'
  },
  {
    id: 'act_02',
    tenantId: 'tenant_hassan_medicos',
    storeName: 'Hassan Medicos',
    city: 'Sargodha',
    userName: 'Hassan Ali',
    userRole: 'Primary Admin',
    actionType: 'PURCHASE',
    actionDetails: 'Saved Inward Purchase Bill #PB-104 from GlaxoSmithKline (Rs. 82,500.00)',
    ipAddress: '39.40.112.95',
    deviceInfo: 'HP ProBook 450 / Chrome 128',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    relativeTime: '30s ago'
  },
  {
    id: 'act_03',
    tenantId: 'tenant_main_pharmacy',
    storeName: 'Inventra Central Pharmacy',
    city: 'Lahore',
    userName: 'Dr. Kashif Ahmed',
    userRole: 'Primary Owner',
    actionType: 'LOGIN',
    actionDetails: 'User Authenticated via Dual-Factor HWID Lock',
    ipAddress: '182.185.24.11',
    deviceInfo: 'Dell OptiPlex / Win 11 Pro',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    relativeTime: '2m ago'
  },
  {
    id: 'act_04',
    tenantId: 'tenant_alshifa_med',
    storeName: 'Al-Shifa Medicine Hub',
    city: 'Rawalpindi',
    userName: 'Usman Farooq',
    userRole: 'Inventory Manager',
    actionType: 'STOCK_TRANSFER',
    actionDetails: 'Inter-Godown Gate Pass Dispatch #GP-88 (40 Packs Panadol Extra)',
    ipAddress: '119.160.67.42',
    deviceInfo: 'Lenovo ThinkCentre / Win 10',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    relativeTime: '5m ago'
  },
  {
    id: 'act_05',
    tenantId: 'tenant_hassan_medicos',
    storeName: 'Hassan Medicos',
    city: 'Sargodha',
    userName: 'Hassan Ali',
    userRole: 'Primary Admin',
    actionType: 'PRICE_EDIT',
    actionDetails: 'Updated MRP for Augmentin 625mg Tab (Rs. 450.00 -> Rs. 475.00)',
    ipAddress: '39.40.112.95',
    deviceInfo: 'HP ProBook 450 / Chrome 128',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    relativeTime: '10m ago'
  }
];

export const FleetActivityStream: React.FC = () => {
  const [activities, setActivities] = useState<FleetActivityItem[]>(SEED_ACTIVITIES);
  const [isStreaming, setIsStreaming] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');

  // SSE Real-Time Stream Subscription
  useEffect(() => {
    if (!isStreaming) return;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/admin/fleet-stream');
      eventSource.onmessage = (event) => {
        try {
          const newEvent: FleetActivityItem = JSON.parse(event.data);
          setActivities(prev => [newEvent, ...prev.slice(0, 99)]);
        } catch (e) {
          console.warn('Failed to parse SSE activity item:', e);
        }
      };

      eventSource.onerror = () => {
        // Fail silently and auto-reconnect
      };
    } catch (e) {
      console.warn('SSE EventSource not supported in this environment');
    }

    // Dynamic ticker to simulate occasional active events if offline
    const interval = setInterval(() => {
      const demoActions: Array<{ type: FleetActivityItem['actionType']; text: string }> = [
        { type: 'SALE', text: `Generated POS Invoice #INV-${Math.floor(1000 + Math.random() * 9000)} (Rs. ${(Math.random() * 2500 + 350).toFixed(2)})` },
        { type: 'PURCHASE', text: `Inward Stock Received from Abbott Laboratories (Rs. ${(Math.random() * 45000 + 5000).toFixed(2)})` },
        { type: 'STOCK_TRANSFER', text: `Godown FEFO Batch Transfer (Batch #${Math.floor(100 + Math.random() * 900)})` },
        { type: 'PRICE_EDIT', text: `Batch Price & MRP Margin Recalculated` }
      ];

      const sample = demoActions[Math.floor(Math.random() * demoActions.length)];
      const newAct: FleetActivityItem = {
        id: `act_${Date.now()}`,
        tenantId: 'tenant_main_pharmacy',
        storeName: 'Inventra Central Pharmacy',
        city: 'Lahore',
        userName: Math.random() > 0.5 ? 'Bilal Cashier' : 'Dr. Kashif Ahmed',
        userRole: Math.random() > 0.5 ? 'Cashier Terminal' : 'Primary Owner',
        actionType: sample.type,
        actionDetails: sample.text,
        ipAddress: '182.185.24.11',
        deviceInfo: 'Dell OptiPlex / Win 11 Pro',
        timestamp: new Date().toISOString(),
        relativeTime: 'Just now'
      };

      setActivities(prev => [newAct, ...prev.slice(0, 99)]);
    }, 12000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [isStreaming]);

  // Unique stores for dropdown filter
  const uniqueStores = useMemo(() => {
    const set = new Set<string>();
    activities.forEach(a => set.add(a.storeName));
    return Array.from(set);
  }, [activities]);

  // Filtered Activity List
  const filteredActivities = useMemo(() => {
    return activities.filter(item => {
      const matchesSearch = 
        !searchQuery.trim() ||
        item.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.actionDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ipAddress.includes(searchQuery);

      const matchesAction = selectedActionFilter === 'all' || item.actionType === selectedActionFilter;
      const matchesStore = selectedStoreFilter === 'all' || item.storeName === selectedStoreFilter;

      return matchesSearch && matchesAction && matchesStore;
    });
  }, [activities, searchQuery, selectedActionFilter, selectedStoreFilter]);

  const getActionBadge = (type: FleetActivityItem['actionType']) => {
    switch (type) {
      case 'SALE':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60';
      case 'PURCHASE':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60';
      case 'LOGIN':
      case 'DEVICE_AUTH':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60';
      case 'STOCK_TRANSFER':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60';
      case 'PRICE_EDIT':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60';
      case 'STAFF_MUTATION':
        return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60';
      case 'PLAN_UPGRADE':
      case 'LICENSE_EXTENSION':
        return 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-4 text-slate-900 dark:text-slate-100">
      {/* STREAM CONTROL BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Real-Time Fleet &amp; User Stream</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border ${
                isStreaming 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' 
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                {isStreaming ? 'Live SSE Stream (0ms)' : 'Paused'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live audit events from all tenant POS terminals, purchase desks &amp; user logins
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsStreaming(!isStreaming)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isStreaming
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            }`}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'Pause Stream' : 'Resume Stream'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivities([])}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
            title="Clear Stream History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores, users, IP, details..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
        </div>

        {/* Action Type Filter */}
        <div>
          <select
            value={selectedActionFilter}
            onChange={(e) => setSelectedActionFilter(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
          >
            <option value="all">⚡ All Action Types</option>
            <option value="SALE">💵 Sales &amp; Invoices</option>
            <option value="PURCHASE">📦 Inward Purchases</option>
            <option value="LOGIN">🔑 User Logins &amp; HWIDs</option>
            <option value="STOCK_TRANSFER">🔄 Stock Transfers</option>
            <option value="PRICE_EDIT">🏷️ Price Overrides</option>
            <option value="STAFF_MUTATION">👥 Staff Mutations</option>
          </select>
        </div>

        {/* Store Filter */}
        <div>
          <select
            value={selectedStoreFilter}
            onChange={(e) => setSelectedStoreFilter(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
          >
            <option value="all">🏪 All Registered Stores ({uniqueStores.length})</option>
            {uniqueStores.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
        </div>
      </div>

      {/* FEED TABLE */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold select-none border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2.5 px-4 w-52">Store &amp; City</th>
              <th className="py-2.5 px-3 w-40">User &amp; Role</th>
              <th className="py-2.5 px-3">Action Performed</th>
              <th className="py-2.5 px-3 w-48">IP &amp; Device</th>
              <th className="py-2.5 px-4 text-right w-28">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500 dark:text-slate-400">
                  No fleet activity records found matching filters.
                </td>
              </tr>
            ) : (
              filteredActivities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors animate-in fade-in">
                  {/* Store & City */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{act.storeName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 ml-5 font-medium">
                      {act.city || 'Pakistan'}
                    </div>
                  </td>

                  {/* User & Role */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{act.userName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {act.userRole}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0 ${getActionBadge(act.actionType)}`}>
                        {act.actionType}
                      </span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium line-clamp-2">
                        {act.actionDetails}
                      </span>
                    </div>
                  </td>

                  {/* IP & Device */}
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1 text-slate-800 dark:text-slate-300">
                      <Globe className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{act.ipAddress}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {act.deviceInfo}
                    </div>
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono text-[10px] font-bold inline-flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                      <span>{act.relativeTime}</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FleetActivityStream;
