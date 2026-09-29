import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Building2, Key, Users, ShieldAlert, 
  ExternalLink, RotateCcw, X, Loader2, ArrowRight, 
  MapPin, Phone, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { ServerTabKey } from '../../pages/MasterServerHub';

interface SearchResultItem {
  tenants: Array<{
    id: string;
    tenant_id: string;
    name: string;
    owner_name: string;
    owner_phone: string;
    city: string;
    drug_license_no?: string;
    ntn_number?: string;
    plan: string;
    status: string;
  }>;
  licenses: Array<{
    id: string;
    tenant_id: string;
    license_key: string;
    bound_hwid?: string;
    plan: string;
    status: string;
    tenant_name?: string;
  }>;
  users: Array<{
    id: string;
    tenant_id: string;
    name: string;
    username: string;
    email_or_phone: string;
    role: string;
    status: string;
    is_kill_switch_active: number;
    tenant_name?: string;
  }>;
  logs: Array<{
    id: string;
    tenant_id: string;
    action: string;
    details: string;
    ip_address: string;
    created_at: string;
  }>;
}

interface ServerGlobalSearchProps {
  onSelectTab: (tab: ServerTabKey) => void;
  onNotify: (msg: string) => void;
}

export function ServerGlobalSearch({ onSelectTab, onNotify }: ServerGlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [resettingHwidKey, setResettingHwidKey] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/master/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { 'x-master-pin': 'Ami7788!@' }
        });
        const data = await res.json();
        if (data.success && data.results) {
          setResults(data.results);
          setIsOpen(true);
        }
      } catch (err) {
        console.warn('Search query notice:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  // Quick 1-Click HWID Reset from Search Result
  const handleResetHwid = async (licenseKey: string) => {
    setResettingHwidKey(licenseKey);
    try {
      const res = await fetch('/api/master/license/reset-hwid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-master-pin': 'Ami7788!@'
        },
        body: JSON.stringify({ license_key: licenseKey })
      });
      const data = await res.json();
      if (data.success) {
        onNotify(`HWID unlinked for ${licenseKey}. Client can now bind new laptop.`);
        // Update local results
        if (results?.licenses) {
          setResults({
            ...results,
            licenses: results.licenses.map(l => l.license_key === licenseKey ? { ...l, bound_hwid: undefined } : l)
          });
        }
      }
    } catch (e: any) {
      onNotify('HWID reset failed: ' + e?.message);
    } finally {
      setResettingHwidKey(null);
    }
  };

  const totalHits = (results?.tenants.length || 0) + 
                    (results?.licenses.length || 0) + 
                    (results?.users.length || 0) + 
                    (results?.logs.length || 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Global Server Search (Tenants, HWID, Licenses, Users, Audit Logs)..."
          value={query}
          onFocus={() => { if (results) setIsOpen(true); }}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 absolute right-3 text-indigo-400 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults(null); }}
            className="w-4 h-4 absolute right-3 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen && results && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[75vh] overflow-y-auto divide-y divide-slate-800/80">
          {/* Header Summary */}
          <div className="px-4 py-2.5 bg-slate-950/80 flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Server Query Results ({totalHits} matches)</span>
            <span className="font-mono text-indigo-400">{query}</span>
          </div>

          {totalHits === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching server records found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* 1. Pharmacy Tenants / Stores */}
          {results.tenants.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Pharmacy Companies & Stores ({results.tenants.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.tenants.map(t => (
                  <div
                    key={t.id || t.tenant_id}
                    className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{t.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-normal">
                          {t.city}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                        <span>ID: {t.tenant_id}</span>
                        {t.drug_license_no && <span>• Lic: {t.drug_license_no}</span>}
                        {t.owner_phone && <span>• Phone: {t.owner_phone}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('clients');
                        setIsOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-bold shrink-0 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Store</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. License Keys & Hardware HWID */}
          {results.licenses.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>License Serials & HWID Hardware Keys ({results.licenses.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.licenses.map(l => (
                  <div
                    key={l.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-2">
                        <span>{l.license_key}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-sans font-normal">
                          {l.plan}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        HWID: {l.bound_hwid ? (
                          <span className="text-slate-300">{l.bound_hwid}</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Unbound (Ready for Laptop Transfer)</span>
                        )}
                        {l.tenant_name && <span className="ml-2">• {l.tenant_name}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {l.bound_hwid && (
                        <button
                          type="button"
                          disabled={resettingHwidKey === l.license_key}
                          onClick={() => handleResetHwid(l.license_key)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Unbind HWID (Laptop Stolen / Damaged)"
                        >
                          <RotateCcw className={`w-3 h-3 ${resettingHwidKey === l.license_key ? 'animate-spin' : ''}`} />
                          <span>Reset HWID</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTab('devices');
                          setIsOpen(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                      >
                        Devices
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Global Staff Users */}
          {results.users.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Global Users & Staff Directory ({results.users.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.users.map(u => (
                  <div
                    key={u.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{u.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-normal">
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {u.email_or_phone || u.username} • Store: {u.tenant_name || u.tenant_id}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('users_control');
                        setIsOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Govern User
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Security Audit Logs */}
          {results.logs.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Security Audit Log Events ({results.logs.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.logs.map(log => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-400">{log.action}</span>
                      <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans">{log.details}</p>
                    <div className="text-[10px] text-slate-500 font-mono">IP: {log.ip_address} • Tenant: {log.tenant_id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
