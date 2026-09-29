import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Building2, Users, Key, FileText, 
  ArrowRight, X, Sparkles, ExternalLink, Zap,
  Laptop, ShieldAlert, CheckCircle2, Clock
} from 'lucide-react';
import { handleSilentSwitchUser } from '../../services/adminService';

export interface GlobalSearchResult {
  tenants: Array<{ id: string; name: string; city?: string; plan?: string; phone?: string }>;
  users: Array<{ id: string; name: string; role: string; storeName?: string; tenantId?: string; passcode?: string }>;
  licenses: Array<{ id: string; key: string; clientName: string; plan?: string; hwid?: string }>;
  auditLogs: Array<{ id: string; action: string; details: string; user?: string; timestamp?: string }>;
}

interface MasterGlobalSearchBarProps {
  onSelectTenant?: (tenantId: string) => void;
  onSelectUser?: (userId: string) => void;
  onSelectTab?: (tabName: string) => void;
  placeholder?: string;
}

export const MasterGlobalSearchBar: React.FC<MasterGlobalSearchBarProps> = ({
  onSelectTenant,
  onSelectUser,
  onSelectTab,
  placeholder = 'Global Server Search (Tenants, HWID, Licenses, Users, Audit Logs)...'
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult>({
    tenants: [],
    users: [],
    licenses: [],
    auditLogs: []
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Flattened items for keyboard navigation
  const flattenedResults = [
    ...results.tenants.map(t => ({ type: 'tenant' as const, item: t, key: `t_${t.id}` })),
    ...results.users.map(u => ({ type: 'user' as const, item: u, key: `u_${u.id}` })),
    ...results.licenses.map(l => ({ type: 'license' as const, item: l, key: `l_${l.id}` })),
    ...results.auditLogs.map(a => ({ type: 'audit' as const, item: a, key: `a_${a.id}` }))
  ];

  const totalResultsCount = flattenedResults.length;

  // Execute fast search query
  useEffect(() => {
    if (!query.trim()) {
      setResults({ tenants: [], users: [], licenses: [], auditLogs: [] });
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const q = encodeURIComponent(query.trim());
        const res = await fetch(`/api/fleet/search?q=${q}`).catch(() => null);
        
        if (res && res.ok) {
          const data = await res.json();
          setResults({
            tenants: data.tenants || [],
            users: data.users || [],
            licenses: data.licenses || [],
            auditLogs: data.auditLogs || []
          });
          setIsOpen(true);
          setSelectedIndex(0);
        } else {
          // Fallback search in sync data
          const syncRes = await fetch('/api/sync/all').catch(() => null);
          if (syncRes && syncRes.ok) {
            const syncData = await syncRes.json();
            const qLower = query.toLowerCase();
            const allTenants = (syncData.tenants || []).filter((t: any) =>
              (t.name && t.name.toLowerCase().includes(qLower)) ||
              (t.city && t.city.toLowerCase().includes(qLower)) ||
              (t.id && t.id.toLowerCase().includes(qLower))
            );
            const allUsers = (syncData.users || []).filter((u: any) =>
              (u.name && u.name.toLowerCase().includes(qLower)) ||
              (u.emailOrPhone && u.emailOrPhone.toLowerCase().includes(qLower)) ||
              (u.role && u.role.toLowerCase().includes(qLower))
            );
            const allLicenses = (syncData.licenses || []).filter((l: any) =>
              (l.licenseKey && l.licenseKey.toLowerCase().includes(qLower)) ||
              (l.clientName && l.clientName.toLowerCase().includes(qLower))
            );
            setResults({
              tenants: allTenants.slice(0, 5),
              users: allUsers.slice(0, 5),
              licenses: allLicenses.slice(0, 5),
              auditLogs: []
            });
            setIsOpen(true);
            setSelectedIndex(0);
          }
        }
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || totalResultsCount === 0) {
      if (e.key === 'Escape') setQuery('');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalResultsCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalResultsCount) % totalResultsCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flattenedResults[selectedIndex];
      if (selected) {
        handleSelectItem(selected.type, selected.item);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectItem = (type: 'tenant' | 'user' | 'license' | 'audit', item: any) => {
    setIsOpen(false);
    if (type === 'tenant') {
      if (onSelectTenant) onSelectTenant(item.id);
      if (onSelectTab) onSelectTab('stores');
    } else if (type === 'user') {
      if (onSelectUser) onSelectUser(item.id);
      if (onSelectTab) onSelectTab('users_control');
    } else if (type === 'license') {
      if (onSelectTab) onSelectTab('devices');
    } else if (type === 'audit') {
      if (onSelectTab) onSelectTab('security_audit');
    }
  };

  const handleShadowSwitch = (e: React.MouseEvent, tenantOrUser: any) => {
    e.stopPropagation();
    handleSilentSwitchUser(tenantOrUser);
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* Top Search Input Box */}
      <div className="relative flex items-center">
        <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
          isLoading ? 'text-blue-500 animate-pulse' : 'text-slate-400'
        }`} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim() && totalResultsCount > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
            ESC
          </kbd>
        </div>
      </div>

      {/* Floating Categorized Results Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[9999] max-h-[75vh] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-98 duration-150"
        >
          {totalResultsCount === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching stores, staff users, licenses or audit logs found for "{query}".
            </div>
          ) : (
            <>
              {/* Category 1: Stores & Tenants */}
              {results.tenants.length > 0 && (
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      Matching Stores &amp; Tenants ({results.tenants.length})
                    </span>
                  </div>

                  <div className="space-y-1">
                    {results.tenants.map((t) => {
                      const globalIdx = flattenedResults.findIndex(f => f.key === `t_${t.id}`);
                      const isSelected = globalIdx === selectedIndex;

                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectItem('tenant', t)}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                              {t.name ? t.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div className="truncate">
                              <span className="font-bold text-slate-900 dark:text-white block truncate">
                                {t.name}
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {t.city || 'Pakistan'} • Plan: {t.plan || 'Gold'} • ID: {t.id}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleShadowSwitch(e, t)}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                              title="1-Click Silent Shadow Switch"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Shadow</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 2: Staff & Cashiers */}
              {results.users.length > 0 && (
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      Matching Staff &amp; Cashiers ({results.users.length})
                    </span>
                  </div>

                  <div className="space-y-1">
                    {results.users.map((u) => {
                      const globalIdx = flattenedResults.findIndex(f => f.key === `u_${u.id}`);
                      const isSelected = globalIdx === selectedIndex;

                      return (
                        <div
                          key={u.id}
                          onClick={() => handleSelectItem('user', u)}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {u.name}
                                </span>
                                <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                  {u.role}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block truncate">
                                Store: {u.storeName || 'Main Store'} • Passcode: {u.passcode || '****'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleShadowSwitch(e, u)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Silent Shadow Switch"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Switch</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 3: Licenses & HWIDs */}
              {results.licenses.length > 0 && (
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-500" />
                      Matching Licenses &amp; HWIDs ({results.licenses.length})
                    </span>
                  </div>

                  <div className="space-y-1">
                    {results.licenses.map((l) => {
                      const globalIdx = flattenedResults.findIndex(f => f.key === `l_${l.id}`);
                      const isSelected = globalIdx === selectedIndex;

                      return (
                        <div
                          key={l.id}
                          onClick={() => handleSelectItem('license', l)}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 block">
                              {l.key}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              Client: {l.clientName} • Plan: {l.plan || 'Gold'} • HWID: {l.hwid || 'Bound'}
                            </span>
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 4: Audit Logs */}
              {results.auditLogs.length > 0 && (
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-rose-500" />
                      Matching Audit Logs ({results.auditLogs.length})
                    </span>
                  </div>

                  <div className="space-y-1">
                    {results.auditLogs.map((a) => {
                      const globalIdx = flattenedResults.findIndex(f => f.key === `a_${a.id}`);
                      const isSelected = globalIdx === selectedIndex;

                      return (
                        <div
                          key={a.id}
                          onClick={() => handleSelectItem('audit', a)}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white block truncate">
                              {a.action}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {a.details} {a.user ? `• By: ${a.user}` : ''}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-400 shrink-0">
                            {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer Keyboard Helper */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>Navigate: <kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">↑</kbd> <kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">↓</kbd></span>
              <span>Select: <kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">↵</kbd></span>
            </span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
