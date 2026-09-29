import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  PlusCircle, 
  RefreshCw, 
  Lock, 
  MoreVertical, 
  Zap, 
  Smartphone,
  Laptop,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  Shield,
  Clock,
  Radio,
  Building2,
  Key
} from 'lucide-react';

export interface DeviceBinding {
  id: string;
  license_key: string;
  pharmacy_name: string;
  hwid: string;
  device_name: string;
  ip_address: string;
  last_active: string;
  status: 'active' | 'pending' | 'locked';
  terminals_used: number;
  max_terminals: number;
}

export const MasterHardwareBindingsActions: React.FC<{
  device: DeviceBinding;
  onRefresh: () => void;
  onNotify?: (msg: string) => void;
}> = ({ device, onRefresh, onNotify }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: string, payload: any = {}) => {
    setLoading(true);
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/admin/devices/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          licenseKey: device.license_key,
          hwid: device.hwid,
          ...payload
        })
      });
      const data = await res.json();
      if (data.success) {
        const msg = data.message || 'Action executed successfully';
        if (onNotify) onNotify(msg);
        else window.dispatchEvent(new CustomEvent('mbi-toast', { detail: { message: msg, type: 'success' } }));
        onRefresh();
      } else {
        const err = data.error || 'Failed to execute action';
        if (onNotify) onNotify(err);
        else window.dispatchEvent(new CustomEvent('mbi-toast', { detail: { message: err, type: 'error' } }));
      }
    } catch (err: any) {
      if (onNotify) onNotify('Server connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-end gap-2">
      {/* Quick Button 1: Authorize New Device */}
      <button
        type="button"
        onClick={() => handleAction('authorize_device')}
        disabled={loading}
        title="Authorize / Continue New Device"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
      >
        <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span>Continue Device</span>
      </button>

      {/* Advanced Action Dropdown Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={loading}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-all cursor-pointer disabled:opacity-50"
          title="More Terminal Actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <>
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setMenuOpen(false)} 
            />
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl py-2 z-40 text-xs divide-y divide-slate-800/80 animate-in fade-in zoom-in-95 duration-150">
              
              {/* Fleet Controls */}
              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleAction('grant_terminal_slot')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold">⚡ Grant +1 Terminal Slot</div>
                    <div className="text-[10px] text-slate-400">Add emergency checkout PC</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction('reset_fingerprint')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-semibold">🔄 Reset HWID Fingerprint</div>
                    <div className="text-[10px] text-slate-400">Allow re-bind on fresh Windows</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAction('remote_freeze')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <div className="font-semibold">🛡️ Remote Freeze Session</div>
                    <div className="text-[10px] text-slate-400">Instantly lock terminal screen</div>
                  </div>
                </button>
              </div>

              {/* Danger Zone: Unbind / Delete */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete and unbind hardware ID: ${device.hwid}?`)) {
                      handleAction('delete_device');
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <div className="font-semibold">🗑️ Delete / Unbind Device</div>
                    <div className="text-[10px] text-slate-500">Remove HWID from database</div>
                  </div>
                </button>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const MasterHardwareBindingsTab: React.FC<{
  onNotify?: (msg: string) => void;
}> = ({ onNotify }) => {
  const [devices, setDevices] = useState<DeviceBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'locked'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToastMsg(msg);
    if (onNotify) onNotify(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchBindings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/devices/bindings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.bindings)) {
          setDevices(data.bindings);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch hardware bindings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBindings();
    const handleSseUpdate = () => fetchBindings();
    window.addEventListener('mbi-security-alerts-updated', handleSseUpdate);
    window.addEventListener('mbi-devices-updated', handleSseUpdate);
    return () => {
      window.removeEventListener('mbi-security-alerts-updated', handleSseUpdate);
      window.removeEventListener('mbi-devices-updated', handleSseUpdate);
    };
  }, []);

  const filteredDevices = devices.filter(d => {
    const matchesSearch = 
      d.pharmacy_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.license_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hwid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ip_address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Toast alert */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">User Device Manager & Fleet Security</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  MARIADB LIVE SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authorize terminal devices, wipe bindings, grant emergency slots, reset formatted PC HWIDs, and trigger remote freeze actions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchBindings}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer active:scale-95 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pharmacy, license, HWID, IP..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          {(['all', 'active', 'pending', 'locked'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                statusFilter === st 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Devices Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Pharmacy & License</th>
                <th className="py-3.5 px-4">Device & Model</th>
                <th className="py-3.5 px-4">Hardware Fingerprint (HWID)</th>
                <th className="py-3.5 px-4">Slots Used</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Master Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                    <p className="font-bold">Loading Fleet Hardware Bindings...</p>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <Laptop className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="font-bold">No hardware device bindings matched your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map(dev => {
                  return (
                    <tr key={dev.id} className="hover:bg-slate-850/60 transition-colors">
                      {/* Pharmacy & License */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{dev.pharmacy_name}</span>
                        </div>
                        <div className="text-[11px] font-mono text-blue-400/90 mt-0.5 flex items-center gap-1">
                          <Key className="w-3 h-3 text-slate-500" />
                          <span>{dev.license_key}</span>
                        </div>
                      </td>

                      {/* Device & Model */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{dev.device_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          IP: {dev.ip_address} • Last: {dev.last_active}
                        </div>
                      </td>

                      {/* HWID */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-cyan-300 font-bold select-all inline-block">
                          {dev.hwid}
                        </span>
                      </td>

                      {/* Slots */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          dev.terminals_used >= dev.max_terminals
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {dev.terminals_used} / {dev.max_terminals} Active
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {dev.status === 'active' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>ACTIVE</span>
                          </span>
                        ) : dev.status === 'locked' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                            <Lock className="w-3 h-3 text-rose-400" />
                            <span>FROZEN</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>

                      {/* Master Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <MasterHardwareBindingsActions
                          device={dev}
                          onRefresh={fetchBindings}
                          onNotify={notify}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MasterHardwareBindingsTab;
