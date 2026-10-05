import React, { useState, useEffect } from 'react';
import { 
  Shield, ShieldAlert, ShieldCheck, ShieldBan, 
  Search, Filter, Trash2, Download, AlertTriangle, 
  RefreshCw, CheckCircle2, XCircle, Globe, Smartphone, 
  Laptop, User, Clock, MapPin, Ban, Plus, Key, Lock, Eye,
  Sliders, Zap, ShieldQuestion, Activity, Cpu, Play
} from 'lucide-react';
import { 
  getLoginAuditLogs, 
  LoginAttemptRecord, 
  getBlockedIps, 
  BlockedIpRecord, 
  getWhitelistedIps,
  WhitelistedIpRecord,
  isIpWhitelisted,
  whitelistIpAddress,
  removeWhitelistedIp,
  blockIpAddress, 
  unblockIpAddress, 
  clearLoginAuditLogs, 
  recordLoginAttempt,
  getCurrentClientIp,
  getSecuritySettings,
  saveSecuritySettings,
  SecurityDefenseSettings
} from '../../lib/securityAuditService';

interface SecurityAuditLogPanelProps {
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const SecurityAuditLogPanel: React.FC<SecurityAuditLogPanelProps> = ({ showToast }) => {
  const [logs, setLogs] = useState<LoginAttemptRecord[]>(getLoginAuditLogs);
  const [blockedIps, setBlockedIps] = useState<BlockedIpRecord[]>(getBlockedIps);
  const [whitelistedIps, setWhitelistedIps] = useState<WhitelistedIpRecord[]>(getWhitelistedIps);
  const [defenseSettings, setDefenseSettings] = useState<SecurityDefenseSettings>(getSecuritySettings);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'SUSPICIOUS'>('ALL');
  const [systemFilter, setSystemFilter] = useState<string>('ALL');

  // Manual IP Block Modal / Input
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newBlockIp, setNewBlockIp] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('Suspicious automated login attempts');

  // Manual Whitelist Modal
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [newWhitelistIp, setNewWhitelistIp] = useState('');
  const [newWhitelistReason, setNewWhitelistReason] = useState('Authorized client terminal (Admin Approved)');

  // Simulator State
  const [simulatorIp, setSimulatorIp] = useState('198.51.100.99');
  const [simulatorUser, setSimulatorUser] = useState('intruder_brute');
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  // Active View Tab inside Security Audit Panel
  const [activeSubTab, setActiveSubTab] = useState<'attempts' | 'blocked_ips' | 'whitelist' | 'radar'>('attempts');

  const refreshData = () => {
    setLogs(getLoginAuditLogs());
    setBlockedIps(getBlockedIps());
    setWhitelistedIps(getWhitelistedIps());
    setDefenseSettings(getSecuritySettings());
  };

  useEffect(() => {
    const handleUpdate = () => {
      refreshData();
    };
    window.addEventListener('mbi-security-audit-updated', handleUpdate);
    window.addEventListener('mbi-blocked-ips-updated', handleUpdate);
    window.addEventListener('mbi-whitelisted-ips-updated', handleUpdate);
    window.addEventListener('mbi-security-settings-updated', handleUpdate);
    return () => {
      window.removeEventListener('mbi-security-audit-updated', handleUpdate);
      window.removeEventListener('mbi-blocked-ips-updated', handleUpdate);
      window.removeEventListener('mbi-whitelisted-ips-updated', handleUpdate);
      window.removeEventListener('mbi-security-settings-updated', handleUpdate);
    };
  }, []);

  const handleBlockIp = (ipToBlock: string, reason?: string) => {
    if (!ipToBlock.trim()) return;
    blockIpAddress(ipToBlock.trim(), reason || 'Blocked via Security Audit Log panel', 'Master Admin');
    refreshData();
    if (showToast) {
      showToast('warning', 'IP Blocked', `IP address ${ipToBlock} has been blocked from accessing the system.`);
    }
  };

  const handleUnblockIp = (ipToUnblock: string) => {
    // Unblocking automatically marks as Whitelisted (Protected from Auto-Block)
    unblockIpAddress(ipToUnblock, true);
    refreshData();
    if (showToast) {
      showToast('success', 'IP Unblocked & Whitelisted', `IP ${ipToUnblock} is unblocked and marked as Admin-Safe. It will never be auto-blocked again.`);
    }
  };

  const handleAddToWhitelist = (ip: string, reason?: string) => {
    if (!ip.trim()) return;
    whitelistIpAddress(ip.trim(), reason || 'Admin Approved & Protected', 'Master Admin');
    refreshData();
    if (showToast) {
      showToast('success', 'Added to Safe Whitelist', `IP ${ip} is now protected from Automated Threat Block.`);
    }
  };

  const handleRemoveFromWhitelist = (ip: string) => {
    removeWhitelistedIp(ip);
    refreshData();
    if (showToast) {
      showToast('info', 'Removed from Whitelist', `IP ${ip} will now be subject to standard automated threat defense.`);
    }
  };

  const handleToggleAutoBlock = () => {
    const updated = saveSecuritySettings({ autoBlockEnabled: !defenseSettings.autoBlockEnabled });
    setDefenseSettings(updated);
    if (showToast) {
      showToast(
        updated.autoBlockEnabled ? 'success' : 'warning', 
        updated.autoBlockEnabled ? 'Auto-Block Enabled' : 'Auto-Block Paused', 
        updated.autoBlockEnabled ? 'Automated threat heuristics will actively block anomalies.' : 'Auto-blocking is paused (logging only).'
      );
    }
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all login audit logs? This action cannot be undone.')) {
      clearLoginAuditLogs();
      refreshData();
      if (showToast) {
        showToast('info', 'Logs Cleared', 'Login audit history has been cleared.');
      }
    }
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      alert('No logs to export.');
      return;
    }
    const headers = ['ID', 'Timestamp', 'Username', 'Target System', 'Status', 'Threat Score', 'Whitelisted', 'IP Address', 'Device ID', 'Device Info', 'Failure Reason', 'Location'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      `"${l.username}"`,
      `"${l.targetSystem}"`,
      l.status,
      l.threatScore ?? 0,
      l.isWhitelisted ? 'YES' : 'NO',
      l.ipAddress,
      `"${l.deviceId}"`,
      `"${(l.deviceInfo || '').replace(/"/g, '""')}"`,
      `"${(l.failureReason || '').replace(/"/g, '""')}"`,
      `"${l.location || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `security_login_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Run Test Threat Simulation
  const handleRunSimulation = (isWhitelistedTest: boolean = false) => {
    const testIp = isWhitelistedTest ? '192.168.1.104' : simulatorIp.trim();
    const testUser = simulatorUser.trim() || 'test_intruder';

    setSimulationStatus(`Simulating 3 rapid failed login attempts for ${testIp}...`);

    for (let i = 0; i < 3; i++) {
      recordLoginAttempt({
        username: testUser,
        targetSystem: 'Central Server Command Center',
        status: 'FAILED',
        ipAddress: testIp,
        deviceId: 'SIMULATED-PROBE-' + (i + 1),
        deviceInfo: 'Mozilla/5.0 (Automated Test Simulation Engine)',
        failureReason: 'Invalid PIN & Unauthorized probe attempt',
        location: 'Simulation Sandbox'
      });
    }

    refreshData();

    setTimeout(() => {
      const isNowBlocked = blockedIps.some(b => b.ip.toLowerCase() === testIp.toLowerCase());
      const isWhite = isIpWhitelisted(testIp);

      if (isWhite) {
        setSimulationStatus(`🛡️ Test Result: IP ${testIp} is Whitelisted by Admin. Auto-Block was BYPASSED successfully! (Zero Blocking applied).`);
      } else {
        setSimulationStatus(`🚨 Test Result: IP ${testIp} exceeded failure limit and was AUTO-BLOCKED by AI Defense Shield!`);
      }
    }, 200);
  };

  const filteredLogs = logs.filter(log => {
    // Status filter
    if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
    // System filter
    if (systemFilter !== 'ALL' && log.targetSystem !== systemFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchIp = log.ipAddress?.toLowerCase().includes(q);
      const matchUser = log.username?.toLowerCase().includes(q);
      const matchDevice = log.deviceId?.toLowerCase().includes(q) || log.deviceInfo?.toLowerCase().includes(q);
      const matchSys = log.targetSystem?.toLowerCase().includes(q);
      const matchLoc = log.location?.toLowerCase().includes(q);
      if (!matchIp && !matchUser && !matchDevice && !matchSys && !matchLoc) return false;
    }
    return true;
  });

  const totalAttempts = logs.length;
  const successCount = logs.filter(l => l.status === 'SUCCESS').length;
  const failedCount = logs.filter(l => l.status === 'FAILED' || l.status === 'SUSPICIOUS').length;
  const blockedCount = logs.filter(l => l.status === 'BLOCKED').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Events</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalAttempts}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Recorded across all portals</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Authorized Logins</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{successCount}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Authorized devices & tokens</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Failed & Anomaly</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{failedCount}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Password / token mismatch</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Blocked Threats</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{blockedIps.length}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{blockedCount} attempts neutralized</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ShieldBan className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Admin Safe Zone</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{whitelistedIps.length}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Protected from auto-block</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab('attempts')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'attempts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Audit Trail & Threat Log ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('blocked_ips')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'blocked_ips'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Blocked IP Firewall ({blockedIps.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('whitelist')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'whitelist'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>🛡️ Admin Safe Zone ({whitelistedIps.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('radar')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'radar'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Threat Radar & Auto-Defense</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBlockModal(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Block IP</span>
          </button>

          <button
            onClick={() => setShowWhitelistModal(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Safe IP</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Logs</span>
          </button>

          <button
            onClick={refreshData}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TAB 1: LOGIN ATTEMPTS AUDIT LOG */}
      {activeSubTab === 'attempts' && (
        <div className="space-y-4">
          
          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by IP address, username, device ID, hardware info, location..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter by Status"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success Only</option>
                <option value="FAILED">Failed Only</option>
                <option value="BLOCKED">Blocked Only</option>
                <option value="SUSPICIOUS">Suspicious Anomaly</option>
              </select>

              <select
                value={systemFilter}
                onChange={(e) => setSystemFilter(e.target.value)}
                aria-label="Filter by Target System"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Target Systems</option>
                <option value="Central Server Command Center">Central Server</option>
                <option value="Store POS Terminal">POS Terminal</option>
                <option value="Client Web Portal">Client Web Portal</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Timestamp & ID</th>
                    <th className="py-3 px-4">Status & Score</th>
                    <th className="py-3 px-4">User / Account</th>
                    <th className="py-3 px-4">Target System</th>
                    <th className="py-3 px-4">IP Address & Protection</th>
                    <th className="py-3 px-4">Device & Hardware Specs</th>
                    <th className="py-3 px-4 text-right">Firewall Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Shield className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-bold">No security login records match your filters</p>
                        <p className="text-[11px] mt-0.5">Try clearing your search query or reset filter dropdowns.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isBlocked = blockedIps.some(b => b.ip.toLowerCase() === log.ipAddress.toLowerCase());
                      const isWhitelistedItem = isIpWhitelisted(log.ipAddress);

                      return (
                        <tr 
                          key={log.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Timestamp & ID */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">{log.id}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              {log.status === 'SUCCESS' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  SUCCESS
                                </span>
                              )}
                              {log.status === 'FAILED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  <XCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  FAILED
                                </span>
                              )}
                              {log.status === 'SUSPICIOUS' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-purple-600" />
                                  SUSPICIOUS
                                </span>
                              )}
                              {log.status === 'BLOCKED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                                  <Ban className="w-3 h-3" />
                                  BLOCKED
                                </span>
                              )}
                              
                              {log.threatScore !== undefined && log.threatScore > 0 && (
                                <span className={`text-[9px] font-bold ${log.threatScore > 70 ? 'text-rose-600' : 'text-slate-400'}`}>
                                  Threat: {log.threatScore}/100
                                </span>
                              )}
                            </div>
                          </td>

                          {/* User / Account */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-blue-500" />
                              <span>{log.username}</span>
                            </div>
                            {log.failureReason && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 leading-tight font-medium max-w-[200px]">
                                {log.failureReason}
                              </div>
                            )}
                          </td>

                          {/* Target System */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {log.targetSystem}
                            </span>
                          </td>

                          {/* IP Address & Whitelist Indicator */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 dark:text-slate-200 flex-wrap">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.ipAddress}</span>
                              {isBlocked && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white">
                                  BLOCKED
                                </span>
                              )}
                              {isWhitelistedItem && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-0.5" title="Admin Whitelisted: Protected from Auto-Block">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  PROTECTED
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{log.location || 'LAN / Cloud'}</span>
                            </div>
                          </td>

                          {/* Device ID & Specs */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              {log.deviceInfo?.includes('Vivo') || log.deviceInfo?.includes('Android') ? (
                                <Smartphone className="w-3.5 h-3.5 text-purple-500" />
                              ) : (
                                <Laptop className="w-3.5 h-3.5 text-blue-500" />
                              )}
                              <span>{log.deviceId}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] mt-0.5" title={log.deviceInfo}>
                              {log.deviceInfo}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isBlocked ? (
                                <button
                                  onClick={() => handleUnblockIp(log.ipAddress)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                                  title="Unblock and add to Safe Whitelist"
                                >
                                  Unblock & Whitelist
                                </button>
                              ) : (
                                <>
                                  {!isWhitelistedItem && (
                                    <button
                                      onClick={() => handleAddToWhitelist(log.ipAddress, `Whitelisted from event ${log.id}`)}
                                      className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold transition-all cursor-pointer"
                                      title="Mark as Admin Safe (Never Auto-Block)"
                                    >
                                      Whitelist
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleBlockIp(log.ipAddress, `Manual block from audit log event ${log.id}`)}
                                    className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Ban className="w-3 h-3" />
                                    <span>Block</span>
                                  </button>
                                </>
                              )}
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
        </div>
      )}

      {/* TAB 2: BLOCKED IP ADDRESSES FIREWALL */}
      {activeSubTab === 'blocked_ips' && (
        <div className="space-y-4">
          <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3">
            <ShieldBan className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-rose-900 dark:text-rose-100">Central IP Address Firewall Active</div>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">
                Any IP address listed below is completely forbidden from logging into the Master Server Command Center, POS Terminals, and API sync endpoints.
                <strong> Note:</strong> When you Unblock an IP, it is automatically granted <strong>Safe Whitelist</strong> protection so the automated scanner will never auto-block it again!
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Blocked IP Addresses Registry ({blockedIps.length})
              </h3>
              <button
                onClick={() => setShowBlockModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add IP to Blocklist</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Blocked IP Address</th>
                    <th className="py-3 px-4">Reason for Block</th>
                    <th className="py-3 px-4">Blocked By</th>
                    <th className="py-3 px-4">Blocked Timestamp</th>
                    <th className="py-3 px-4 text-center">Threat Attempts</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {blockedIps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500">
                        <ShieldCheck className="w-8 h-8 mx-auto mb-1 text-emerald-500 opacity-60" />
                        <p className="font-bold">No IP addresses currently blocked</p>
                        <p className="text-[11px]">Your server perimeter is clear.</p>
                      </td>
                    </tr>
                  ) : (
                    blockedIps.map((item) => (
                      <tr key={item.ip} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5" />
                            <span>{item.ip}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {item.reason}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-bold">
                          {item.blockedBy}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {new Date(item.blockedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            {item.attemptsCount || 1} Blocked
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleUnblockIp(item.ip)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                          >
                            Unblock & Whitelist
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN SAFE ZONE (WHITELISTED IPS) */}
      {activeSubTab === 'whitelist' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 text-xs text-indigo-800 dark:text-indigo-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-indigo-900 dark:text-indigo-100">🛡️ Admin Safe Zone — Protected from Auto-Block</div>
              <p className="mt-0.5 text-indigo-700 dark:text-indigo-300">
                IP addresses in this registry have been explicitly unblocked or approved by the Master Admin. Even if a user from these IPs enters incorrect passwords or triggers anomalies, the system <strong>will NEVER auto-block them</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Admin-Approved Safe IPs ({whitelistedIps.length})
              </h3>
              <button
                onClick={() => setShowWhitelistModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Safe IP to Whitelist</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Safe IP Address</th>
                    <th className="py-3 px-4">Approval Notes / Reason</th>
                    <th className="py-3 px-4">Approved By</th>
                    <th className="py-3 px-4">Whitelisted Date</th>
                    <th className="py-3 px-4 text-center">Auto-Block Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {whitelistedIps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500">
                        <ShieldQuestion className="w-8 h-8 mx-auto mb-1 text-indigo-500 opacity-60" />
                        <p className="font-bold">No custom whitelisted IPs registered</p>
                        <p className="text-[11px]">Unblocking any IP will automatically add it here.</p>
                      </td>
                    </tr>
                  ) : (
                    whitelistedIps.map((item) => (
                      <tr key={item.ip} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{item.ip}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {item.reason}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-bold">
                          {item.whitelistedBy}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {new Date(item.whitelistedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            🛡️ PERMANENTLY EXEMPT
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRemoveFromWhitelist(item.ip)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                              title="Remove whitelist protection (Auto-block will apply if anomaly happens)"
                            >
                              Remove Whitelist
                            </button>
                            <button
                              onClick={() => handleBlockIp(item.ip, 'Manual direct block overriding whitelist')}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer"
                            >
                              Force Block
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: THREAT RADAR & AUTO-DEFENSE CONFIGURATION */}
      {activeSubTab === 'radar' && (
        <div className="space-y-6">
          
          {/* Defense Controls */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span>Automated Anomaly Defense Shield Settings</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time threat heuristics to identify brute force attacks, bot scrapers, and malicious IP probes.
                </p>
              </div>

              <button
                onClick={handleToggleAutoBlock}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                  defenseSettings.autoBlockEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {defenseSettings.autoBlockEnabled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Auto-Defense Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Auto-Defense Paused</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Brute Force Max Failure Threshold
                </label>
                <select
                  value={defenseSettings.maxFailedAttempts}
                  onChange={(e) => {
                    const updated = saveSecuritySettings({ maxFailedAttempts: Number(e.target.value) });
                    setDefenseSettings(updated);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value={3}>3 Consecutive Failures (Aggressive)</option>
                  <option value={5}>5 Consecutive Failures (Standard - Recommended)</option>
                  <option value={8}>8 Consecutive Failures (Relaxed)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Number of failed logins before an untrusted IP is blocked.</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Time Window for Rate Tracking
                </label>
                <select
                  value={defenseSettings.timeWindowMinutes}
                  onChange={(e) => {
                    const updated = saveSecuritySettings({ timeWindowMinutes: Number(e.target.value) });
                    setDefenseSettings(updated);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value={5}>5 Minutes Window</option>
                  <option value={10}>10 Minutes Window</option>
                  <option value={30}>30 Minutes Window</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Rolling timeframe for counting consecutive anomalies.</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Automated Bot & Scanner Neutralizer
                </label>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {defenseSettings.blockBotScanners ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => {
                      const updated = saveSecuritySettings({ blockBotScanners: !defenseSettings.blockBotScanners });
                      setDefenseSettings(updated);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      defenseSettings.blockBotScanners
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                    }`}
                  >
                    Toggle
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Instantly neutralizes python/curl/nikto web scanners.</p>
              </div>
            </div>
          </div>

          {/* Interactive Attack Simulator & Whitelist Protection Tester */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  ⚡ Threat Defense & Whitelist Bypass Simulator
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Test the anomaly defense engine to verify that malicious IPs get auto-blocked, and Admin-Whitelisted IPs remain completely safe.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Test Target IP Address
                </label>
                <input
                  type="text"
                  value={simulatorIp}
                  onChange={(e) => setSimulatorIp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Test Target Username
                </label>
                <input
                  type="text"
                  value={simulatorUser}
                  onChange={(e) => setSimulatorUser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => handleRunSimulation(false)}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulate Brute-Force Attack (Untrusted IP)</span>
              </button>

              <button
                onClick={() => handleRunSimulation(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Simulate User Anomaly (Whitelisted Safe IP)</span>
              </button>
            </div>

            {simulationStatus && (
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 animate-in fade-in duration-150">
                {simulationStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: BLOCK SPECIFIC IP ADDRESS */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Block IP Address</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add IP to server firewall blacklist</p>
                </div>
              </div>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Target IP Address (IPv4 / IPv6)
                </label>
                <input
                  type="text"
                  value={newBlockIp}
                  onChange={(e) => setNewBlockIp(e.target.value)}
                  placeholder="e.g. 192.168.1.150 or 198.51.100.22"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Reason for Block / Threat Note
                </label>
                <input
                  type="text"
                  value={newBlockReason}
                  onChange={(e) => setNewBlockReason(e.target.value)}
                  placeholder="e.g. Automated bot attack, unauthorized access attempt"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newBlockIp.trim()) {
                      alert('Please provide an IP address to block.');
                      return;
                    }
                    handleBlockIp(newBlockIp, newBlockReason);
                    setNewBlockIp('');
                    setShowBlockModal(false);
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Enforce Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD TO ADMIN SAFE WHITELIST */}
      {showWhitelistModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add to Safe Whitelist</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Protect this IP from automated auto-blocks</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhitelistModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Authorized Safe IP Address
                </label>
                <input
                  type="text"
                  value={newWhitelistIp}
                  onChange={(e) => setNewWhitelistIp(e.target.value)}
                  placeholder="e.g. 192.168.1.120 or 110.39.22.44"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Approval Note / Branch Location
                </label>
                <input
                  type="text"
                  value={newWhitelistReason}
                  onChange={(e) => setNewWhitelistReason(e.target.value)}
                  placeholder="e.g. Main Branch POS Terminal 1 (Verified Hardware)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowWhitelistModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newWhitelistIp.trim()) {
                      alert('Please provide an IP address to whitelist.');
                      return;
                    }
                    handleAddToWhitelist(newWhitelistIp, newWhitelistReason);
                    setNewWhitelistIp('');
                    setShowWhitelistModal(false);
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Authorize Safe IP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

