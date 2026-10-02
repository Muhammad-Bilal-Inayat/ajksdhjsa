import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  User,
  Key,
  Smartphone,
  ExternalLink,
  Volume2,
  VolumeX,
  Play,
  FileText,
  Copy,
  Check,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Radio,
  Download,
  Shield,
  Ban,
  Plus,
  Globe
} from 'lucide-react';
import {
  SecurityAlert,
  SecurityThreatMetrics,
  getSecurityAlerts,
  getSecurityThreatMetrics,
  updateSecurityAlertStatus,
  dismissSecurityAlert,
  clearSecurityAlerts,
  simulateThreatEvent,
  playSecurityAlertChime,
  getAllTenants,
  saveTenant,
  Tenant,
  executeRemoteKillSwitch,
  unlockRemoteInstance,
  getAllClientInstances,
  getBlockedIps,
  blockIpAddress,
  unblockIpAddress,
  isIpBlocked,
  isAiAutoBlockEnabled,
  setAiAutoBlockEnabled,
  BlockedIpRecord
} from '../../lib/masterServerService';

interface SecurityAlertsWidgetProps {
  onNotify?: (msg: string) => void;
  compactMode?: boolean;
}

export const SecurityAlertsWidget: React.FC<SecurityAlertsWidgetProps> = ({
  onNotify,
  compactMode = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(compactMode);
  const [alerts, setAlerts] = useState<SecurityAlert[]>(() => getSecurityAlerts());
  const [metrics, setMetrics] = useState<SecurityThreatMetrics>(() => getSecurityThreatMetrics());
  const [tenants, setTenants] = useState<Tenant[]>(() => getAllTenants());
  const [blockedIps, setBlockedIps] = useState<BlockedIpRecord[]>(() => getBlockedIps());
  const [aiAutoBlock, setAiAutoBlock] = useState<boolean>(() => isAiAutoBlockEnabled());
  
  // Firewall Modal & Manual IP Block State
  const [isFirewallModalOpen, setIsFirewallModalOpen] = useState(false);
  const [manualIpInput, setManualIpInput] = useState('');
  const [manualReasonInput, setManualReasonInput] = useState('');
  const [firewallSearchQuery, setFirewallSearchQuery] = useState('');
  
  // Filters
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'UNUSUAL_LOGIN_TIME' | 'BULK_DELETION' | 'MULTIPLE_AUTH_FAILURES'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'NEW' | 'ACTIVE_UNRESOLVED' | 'RESOLVED'>('ACTIVE_UNRESOLVED');
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI & Audio Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<SecurityAlert | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Resolution Modal State
  const [resolvingAlert, setResolvingAlert] = useState<SecurityAlert | null>(null);
  const [resolutionNoteInput, setResolutionNoteInput] = useState('');
  
  // Emergency Lock Action Modal State
  const [lockingTenant, setLockingTenant] = useState<{ tenantId: string; tenantName: string; alertId: string } | null>(null);
  const [lockReason, setLockReason] = useState('Security threat detected from automated anomaly engine');

  // Load and subscribe to real-time events
  const refreshData = () => {
    setAlerts(getSecurityAlerts());
    setMetrics(getSecurityThreatMetrics());
    setTenants(getAllTenants());
    setBlockedIps(getBlockedIps());
    setAiAutoBlock(isAiAutoBlockEnabled());
  };

  useEffect(() => {
    refreshData();

    const handleAlertsUpdated = () => {
      refreshData();
    };

    const handleAlertTriggered = (e: any) => {
      refreshData();
      const newAlert: SecurityAlert = e.detail;
      if (newAlert && onNotify) {
        onNotify(`🚨 Security Alert: ${newAlert.title}`);
      }
    };

    window.addEventListener('mbi-security-alerts-updated', handleAlertsUpdated);
    window.addEventListener('mbi-security-alert-triggered', handleAlertTriggered);
    window.addEventListener('mbi-server-activity-update', handleAlertsUpdated);
    window.addEventListener('mbi-firewall-ips-updated', handleAlertsUpdated);
    window.addEventListener('storage', handleAlertsUpdated);

    // Live polling every 15 seconds (guarded)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshData();
    }, 15000);

    return () => {
      window.removeEventListener('mbi-security-alerts-updated', handleAlertsUpdated);
      window.removeEventListener('mbi-security-alert-triggered', handleAlertTriggered);
      window.removeEventListener('mbi-server-activity-update', handleAlertsUpdated);
      window.removeEventListener('mbi-firewall-ips-updated', handleAlertsUpdated);
      window.removeEventListener('storage', handleAlertsUpdated);
      clearInterval(interval);
    };
  }, [onNotify]);

  // Filtered Alert List
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      // Type filter
      if (selectedTypeFilter !== 'ALL' && a.alertType !== selectedTypeFilter) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter === 'NEW' && a.status !== 'NEW') {
        return false;
      }
      if (selectedStatusFilter === 'ACTIVE_UNRESOLVED' && a.status !== 'NEW' && a.status !== 'ACKNOWLEDGED') {
        return false;
      }
      if (selectedStatusFilter === 'RESOLVED' && a.status !== 'RESOLVED' && a.status !== 'DISMISSED') {
        return false;
      }
      // Tenant filter
      if (selectedTenantFilter !== 'ALL' && a.tenantId !== selectedTenantFilter) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchDesc = a.description.toLowerCase().includes(q);
        const matchTenant = a.tenantName.toLowerCase().includes(q);
        const matchUser = a.userName.toLowerCase().includes(q);
        const matchIp = a.ipAddress.toLowerCase().includes(q);
        const matchEvidence = a.evidence.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTenant && !matchUser && !matchIp && !matchEvidence) {
          return false;
        }
      }
      return true;
    });
  }, [alerts, selectedTypeFilter, selectedStatusFilter, selectedTenantFilter, searchQuery]);

  // Action handlers
  const handleAcknowledge = (alertId: string) => {
    updateSecurityAlertStatus(alertId, 'ACKNOWLEDGED', 'Acknowledged by administrator for investigation');
    if (onNotify) onNotify('Alert marked as Acknowledged.');
  };

  const handleOpenResolveModal = (alert: SecurityAlert) => {
    setResolvingAlert(alert);
    setResolutionNoteInput(
      alert.alertType === 'UNUSUAL_LOGIN_TIME'
        ? 'Verified emergency overtime shift with pharmacy manager; authorized access.'
        : 'Audit verified; restored purged records from backup.'
    );
  };

  const handleConfirmResolve = () => {
    if (!resolvingAlert) return;
    updateSecurityAlertStatus(
      resolvingAlert.id,
      'RESOLVED',
      resolutionNoteInput || 'Resolved and closed by security officer',
      'Master Admin'
    );
    if (onNotify) onNotify(`Alert #${resolvingAlert.id} resolved successfully.`);
    setResolvingAlert(null);
    setResolutionNoteInput('');
  };

  const handleDismiss = (alertId: string) => {
    dismissSecurityAlert(alertId);
    if (onNotify) onNotify('Alert dismissed.');
  };

  const handleExecuteEmergencyLock = () => {
    if (!lockingTenant) return;
    const allInstances = getAllClientInstances();
    const targetInstance = allInstances.find(i => 
      i.clientName.toLowerCase().includes(lockingTenant.tenantName.toLowerCase()) || 
      lockingTenant.tenantName.toLowerCase().includes(i.clientName.toLowerCase())
    );

    if (targetInstance) {
      executeRemoteKillSwitch(targetInstance.installationId, 'emergency_lock', lockReason);
    }

    // Also set tenant status to Suspended
    const targetTenant = tenants.find(t => t.id === lockingTenant.tenantId || t.name === lockingTenant.tenantName);
    if (targetTenant) {
      saveTenant({
        ...targetTenant,
        status: 'Suspended',
        notes: `[EMERGENCY SECURITY SUSPENSION] ${lockReason} (${new Date().toLocaleString()})`
      });
    }

    updateSecurityAlertStatus(
      lockingTenant.alertId,
      'ACKNOWLEDGED',
      `Emergency lockout executed on terminal & tenant marked Suspended. Reason: ${lockReason}`
    );

    if (onNotify) onNotify(`🚨 Emergency lockout enforced on ${lockingTenant.tenantName}!`);
    setLockingTenant(null);
  };

  const handleSimulate = (type: 'UNUSUAL_LOGIN_TIME' | 'BULK_DELETION' | 'MULTIPLE_AUTH_FAILURES') => {
    setIsSimulating(true);
    simulateThreatEvent(type);
    if (soundEnabled) {
      playSecurityAlertChime(type === 'BULK_DELETION' ? 'CRITICAL' : 'HIGH');
    }
    setTimeout(() => {
      setIsSimulating(false);
      if (onNotify) {
        onNotify(`⚡ Simulated test ${type.replace(/_/g, ' ')} injected into activity stream.`);
      }
    }, 400);
  };

  const handleToggleAiAutoBlock = () => {
    const nextVal = !aiAutoBlock;
    setAiAutoBlockEnabled(nextVal);
    setAiAutoBlock(nextVal);
    if (onNotify) {
      onNotify(nextVal 
        ? '⚡ AI Autonomous Defense Activated: Offending threat IPs will be blocked immediately.' 
        : '⚠️ AI Autonomous IP Auto-Blocking Paused.');
    }
  };

  const handleBlockIp = (ip: string, reason?: string, threatType?: string, tenantId?: string, tenantName?: string, alertId?: string) => {
    const updated = blockIpAddress(
      ip, 
      reason || 'Manual security block enforced by administrator', 
      threatType || 'MANUAL_BLOCK', 
      false, 
      'Master Admin', 
      tenantId, 
      tenantName, 
      alertId
    );
    setBlockedIps(updated);
    refreshData();
    if (onNotify) onNotify(`🛡️ IP Address ${ip} has been blocked immediately.`);
  };

  const handleUnblockIp = (ip: string) => {
    const updated = unblockIpAddress(ip, 'Master Admin');
    setBlockedIps(updated);
    refreshData();
    if (onNotify) onNotify(`✅ IP Address ${ip} has been unblocked.`);
  };

  const handleManualBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIpInput.trim()) return;
    handleBlockIp(manualIpInput.trim(), manualReasonInput.trim() || 'Manual IP Firewall Rule Added');
    setManualIpInput('');
    setManualReasonInput('');
  };

  const handleCopyReport = (alert: SecurityAlert) => {
    const reportText = `[MBI INVENTRA SECURITY INCIDENT REPORT]
Incident ID: ${alert.id}
Severity: ${alert.severity}
Threat Classification: ${alert.alertType}
Tenant: ${alert.tenantName} (ID: ${alert.tenantId})
Actor: ${alert.userName} (${alert.userRole})
IP Address: ${alert.ipAddress}
Timestamp: ${alert.timestamp}
Title: ${alert.title}
Details: ${alert.description}
Technical Evidence: ${alert.evidence}
Status: ${alert.status}
Recommended Action: ${alert.actionRecommendation}
Generated by Master Server Security Engine`;

    navigator.clipboard.writeText(reportText);
    setCopiedId(alert.id);
    setTimeout(() => setCopiedId(null), 2500);
    if (onNotify) onNotify('Incident report copied to clipboard.');
  };

  // Severity color badge helper
  const getSeverityBadge = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            CRITICAL THREAT
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            HIGH ANOMALY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-purple-400" />
            SUSPICIOUS
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300">
            INFO
          </span>
        );
    }
  };

  // Status color badge helper
  const getStatusBadge = (status: SecurityAlert['status']) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-600 text-white shadow-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            UNRESOLVED
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
            UNDER REVIEW
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            RESOLVED
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            DISMISSED
          </span>
        );
    }
  };

  // Type icon helper
  const getTypeIcon = (type: SecurityAlert['alertType']) => {
    switch (type) {
      case 'UNUSUAL_LOGIN_TIME':
        return <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
      case 'BULK_DELETION':
        return <Trash2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />;
      case 'MULTIPLE_AUTH_FAILURES':
        return <Key className="w-5 h-5 text-purple-500 dark:text-purple-400" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
    }
  };

  if (isCollapsed) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs font-sans text-slate-900 dark:text-slate-100 p-2.5 sm:p-3" id="security-alerts-compact-bar">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Compact Indicator & Threat Status */}
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar">
            <div className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${
              metrics.activeThreatsCount > 0 
                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40 animate-pulse' 
                : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-xs text-slate-900 dark:text-white">Security Alerts:</span>
              {metrics.activeThreatsCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-rose-600 text-white shadow-2xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  {metrics.activeThreatsCount} Threat{metrics.activeThreatsCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Perimeter Normal
                </span>
              )}
            </div>

            {/* Quick Metrics Badges */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              {metrics.unusualLoginsCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-medium">
                  {metrics.unusualLoginsCount} Off-Hours Login
                </span>
              )}
              {metrics.bulkDeletionsCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-medium">
                  {metrics.bulkDeletionsCount} Mass Deletions
                </span>
              )}
            </div>
          </div>

          {/* Right: Quick Action Simulators & Expand Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleSimulate('UNUSUAL_LOGIN_TIME')}
              disabled={isSimulating}
              className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 text-[10.5px] font-bold transition-all hidden sm:flex items-center gap-1 cursor-pointer"
              title="Simulate 03:45 AM Login"
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Simulate Login</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimulate('BULK_DELETION')}
              disabled={isSimulating}
              className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 text-[10.5px] font-bold transition-all hidden sm:flex items-center gap-1 cursor-pointer"
              title="Simulate Bulk Deletion"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>Simulate Purge</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Expand full security threat matrix"
            >
              <span>Threat Matrix</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs font-sans text-slate-900 dark:text-slate-100" id="security-alerts-widget-container">
      {/* Top Banner Header with Threat Level Visualizer */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${
            metrics.activeThreatsCount > 0 
              ? 'bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse' 
              : 'bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>Tenant Security &amp; Threat Anomaly Alerts</span>
              </h2>
              {metrics.activeThreatsCount > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400 animate-ping" />
                  {metrics.activeThreatsCount} Actionable Threat{metrics.activeThreatsCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Tenant Perimeter Normal
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Autonomous telemetry monitoring for off-hours logins (00:00 - 05:30 AM) and high-volume data wiping across all pharmacy branches.
            </p>
          </div>
        </div>

        {/* Action Controls & Simulator Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Autonomous Defense Engine Switch */}
          <button
            onClick={handleToggleAiAutoBlock}
            className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              aiAutoBlock
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500 shadow-indigo-500/20 hover:brightness-110'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
            title={aiAutoBlock ? 'AI Perimeter Defense Active: Automatic IP Quarantining' : 'AI Auto-Block Disabled'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Auto-Block: <strong className={aiAutoBlock ? 'text-emerald-300' : 'text-slate-500'}>{aiAutoBlock ? 'ACTIVE ⚡' : 'OFF'}</strong></span>
          </button>

          {/* Blocked IPs Firewall Modal Trigger */}
          <button
            onClick={() => setIsFirewallModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Open Blocked IPs & Firewall Rules"
          >
            <Shield className="w-3.5 h-3.5 text-rose-500" />
            <span>Blocked IPs ({blockedIps.length})</span>
          </button>

          {/* Audio Chime Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playSecurityAlertChime('HIGH');
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                : 'bg-slate-50 dark:bg-slate-850 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800'
            }`}
            title={soundEnabled ? 'Audio Chime Active' : 'Audio Chime Muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Sound {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Quick Threat Test Simulators */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-850 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 px-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
              <span>Simulate:</span>
            </span>
            <button
              onClick={() => handleSimulate('UNUSUAL_LOGIN_TIME')}
              disabled={isSimulating}
              className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Test 03:45 AM Off-Hours Login Anomaly"
            >
              <Clock className="w-3 h-3 text-amber-500 dark:text-amber-400" />
              <span>03:45 AM Login</span>
            </button>
            <button
              onClick={() => handleSimulate('BULK_DELETION')}
              disabled={isSimulating}
              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Test Sudden Bulk Record Deletion Anomaly"
            >
              <Trash2 className="w-3 h-3 text-rose-500 dark:text-rose-400" />
              <span>Bulk Purge</span>
            </button>
          </div>

          <button
            onClick={refreshData}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            title="Refresh Security Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            title="Collapse to compact bar"
          >
            <span>Minimize</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
        <div className="p-3.5 sm:p-4 border-r border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{metrics.activeThreatsCount}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Threats</div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 border-r border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-300">{metrics.unusualLoginsCount}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Off-Hours Logins</div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 border-r border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-300">{metrics.bulkDeletionsCount}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mass Deletions</div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-300">{metrics.resolvedCount}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resolved Cases</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedTypeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Anomalies ({alerts.length})
          </button>
          <button
            onClick={() => setSelectedTypeFilter('UNUSUAL_LOGIN_TIME')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              selectedTypeFilter === 'UNUSUAL_LOGIN_TIME'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400/90 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Off-Hours Logins</span>
          </button>
          <button
            onClick={() => setSelectedTypeFilter('BULK_DELETION')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              selectedTypeFilter === 'BULK_DELETION'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-400/90 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Mass Bulk Deletions</span>
          </button>
          <button
            onClick={() => setSelectedTypeFilter('MULTIPLE_AUTH_FAILURES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              selectedTypeFilter === 'MULTIPLE_AUTH_FAILURES'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-400/90 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>PIN / Auth Failures</span>
          </button>
          <button
            onClick={() => setIsFirewallModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40"
          >
            <Shield className="w-3.5 h-3.5 text-rose-500" />
            <span>Firewall Rules ({blockedIps.length})</span>
          </button>
        </div>

        {/* Status Filter & Search Input */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Select */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            <option value="ACTIVE_UNRESOLVED">Active Threats (New & Review)</option>
            <option value="NEW">New Only</option>
            <option value="RESOLVED">Resolved & Closed</option>
            <option value="ALL">All Statuses</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, IP, tenant..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Alert Feed Body */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Security Anomalies Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                All tenant login activities and database modifications are within normal operating hours and transaction volumes.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => handleSimulate('UNUSUAL_LOGIN_TIME')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                Inject Test Anomaly
              </button>
            </div>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 sm:p-5 transition-all hover:bg-slate-50 dark:hover:bg-slate-850/60 ${
                alert.status === 'NEW' ? 'bg-rose-50/30 dark:bg-slate-900/90 border-l-4 border-l-rose-500' : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Left Column: Icon + Core Threat Info */}
                <div className="flex items-start gap-3.5 flex-1">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                    alert.alertType === 'BULK_DELETION'
                      ? 'bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : alert.alertType === 'UNUSUAL_LOGIN_TIME'
                      ? 'bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400'
                      : 'bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400'
                  }`}>
                    {getTypeIcon(alert.alertType)}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{alert.title}</span>
                      {getSeverityBadge(alert.severity)}
                      {getStatusBadge(alert.status)}
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      {alert.description}
                    </p>

                    {/* Evidence & Context Badge Strip */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-300">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        <span className="font-bold">{alert.tenantName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-300">
                        <User className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                        <span>{alert.userName} ({alert.userRole})</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Radio className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        <span>IP: <strong className="text-slate-800 dark:text-slate-200">{alert.ipAddress}</strong></span>
                        {isIpBlocked(alert.ipAddress) ? (
                          <span className="ml-1 px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-[10px] border border-rose-500/30">
                            🔴 IP Blocked
                          </span>
                        ) : (
                          <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                            🟢 Allowed
                          </span>
                        )}
                      </div>
                      {alert.recordsAffected !== undefined && (
                        <div className="flex items-center gap-1 text-rose-600 dark:text-rose-300 font-bold">
                          <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                          <span>Dropped: {alert.recordsAffected} records</span>
                        </div>
                      )}
                    </div>

                    {/* AI Threat Analysis Pill & Box */}
                    {(alert.aiThreatAnalysis || alert.aiConfidenceScore) && (
                      <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                              AI Threat Sentinel ({alert.aiConfidenceScore || 95}% Confidence Score)
                            </span>
                            {alert.aiAutoBlocked && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-[10px] border border-rose-500/30">
                                🛡️ Auto-Quarantined by AI
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-slate-700 dark:text-slate-300">
                            {alert.aiThreatAnalysis || 'AI Neural Baseline detected anomalous deviation from normal pharmacy terminal telemetry.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Recommendation Box */}
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-200/90 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-800 dark:text-amber-300">Prescribed Response: </span>
                        <span>{alert.actionRecommendation}</span>
                      </div>
                    </div>

                    {/* Resolution Note if resolved */}
                    {alert.resolutionNote && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Resolution Note: </span>
                          <span>{alert.resolutionNote}</span>
                          {alert.resolvedBy && <span className="text-slate-400 text-[11px]"> • by {alert.resolvedBy}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Tactical Mitigation Action Buttons */}
                <div className="flex lg:flex-col items-center gap-2 shrink-0 self-end lg:self-start flex-wrap">
                  {/* IP Block / Unblock Button */}
                  {isIpBlocked(alert.ipAddress) ? (
                    <button
                      onClick={() => handleUnblockIp(alert.ipAddress)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Manually unblock this IP address"
                    >
                      <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Unblock IP</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBlockIp(alert.ipAddress, `Threat Alert: ${alert.title}`, alert.alertType, alert.tenantId, alert.tenantName, alert.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Instantly block and quarantine this IP address"
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Block IP</span>
                    </button>
                  )}

                  {/* Emergency Lock Tenant Button */}
                  <button
                    onClick={() => setLockingTenant({ tenantId: alert.tenantId, tenantName: alert.tenantName, alertId: alert.id })}
                    className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-600/20 hover:bg-red-100 dark:hover:bg-red-600/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Lock tenant instance & freeze operations immediately"
                  >
                    <Lock className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                    <span>Lock Tenant</span>
                  </button>

                  {/* Acknowledge Button */}
                  {alert.status === 'NEW' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>Reviewing</span>
                    </button>
                  )}

                  {/* Resolve Incident Button */}
                  {alert.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleOpenResolveModal(alert)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>
                  )}

                  {/* Export / Copy Incident Report */}
                  <button
                    onClick={() => handleCopyReport(alert)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title="Copy incident forensic audit report"
                  >
                    {copiedId === alert.id ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === alert.id ? 'Copied' : 'Report'}</span>
                  </button>

                  {/* Dismiss Button */}
                  {alert.status !== 'DISMISSED' && alert.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Security Anomaly Engine Online • Analyzing all POS terminal audit feeds</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-slate-500">
            Total Logged Incidents: <strong className="text-slate-700 dark:text-slate-300">{alerts.length}</strong>
          </span>
          <button
            onClick={() => {
              if (window.confirm('Clear all historical security alerts?')) {
                clearSecurityAlerts();
                if (onNotify) onNotify('Security alert logs cleared.');
              }
            }}
            className="text-[11px] text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* MODAL: Resolve Security Incident */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-base">Resolve Security Incident #{resolvingAlert.id}</span>
              </div>
              <button
                onClick={() => setResolvingAlert(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p><strong>Incident Title:</strong> {resolvingAlert.title}</p>
              <p><strong>Tenant:</strong> {resolvingAlert.tenantName}</p>
              <p><strong>User / IP:</strong> {resolvingAlert.userName} • {resolvingAlert.ipAddress}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Resolution Notes / Verification Findings
              </label>
              <textarea
                rows={3}
                value={resolutionNoteInput}
                onChange={(e) => setResolutionNoteInput(e.target.value)}
                placeholder="Describe how this anomaly was investigated and verified..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResolvingAlert(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Mark as Resolved</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Enforce Emergency Tenant Lockout */}
      {lockingTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-red-300 dark:border-red-600/50 rounded-2xl p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black">
                <Lock className="w-5 h-5" />
                <span className="text-base">Emergency Lockout: {lockingTenant.tenantName}</span>
              </div>
              <button
                onClick={() => setLockingTenant(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs text-red-700 dark:text-red-300 space-y-1">
              <p className="font-bold">⚠️ Warning: Operational Kill-Switch</p>
              <p>
                Executing this action will immediately freeze POS terminals, reject future sync transactions, and suspend tenant access until manually unblocked by the Master Admin.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Lockout Reason (Logged in Permanent Audit Trail)
              </label>
              <input
                type="text"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Reason for suspension..."
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLockingTenant(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Abort
              </button>
              <button
                type="button"
                onClick={handleExecuteEmergencyLock}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Confirm &amp; Lock Branch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI IP Firewall & Blocklist Manager */}
      {isFirewallModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-slate-900 dark:text-white space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black">
                <Shield className="w-5 h-5" />
                <span className="text-base">AI IP Firewall &amp; Perimeter Blocklist</span>
              </div>
              <button
                onClick={() => setIsFirewallModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* AI Auto-Defense Engine Status Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-900/40 via-blue-900/30 to-indigo-900/40 border border-indigo-500/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-white">Autonomous Threat Quarantine</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${aiAutoBlock ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-500/20 text-slate-400 border border-slate-500/40'}`}>
                    {aiAutoBlock ? 'ACTIVE ⚡' : 'PAUSED'}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-200/80">
                  When suspicious anomalies (bulk deletions, off-hours brute force) are detected, AI automatically bans the offending IP address instantly.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAiAutoBlock}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  aiAutoBlock
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                }`}
              >
                {aiAutoBlock ? 'Disable Auto-Block' : 'Enable Auto-Block'}
              </button>
            </div>

            {/* Manual Add Blocked IP Form */}
            <form onSubmit={handleManualBlockSubmit} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-500" />
                <span>Manually Block an IP Address</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={manualIpInput}
                    onChange={(e) => setManualIpInput(e.target.value)}
                    placeholder="e.g. 192.168.1.150"
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    value={manualReasonInput}
                    onChange={(e) => setManualReasonInput(e.target.value)}
                    placeholder="Block reason (e.g. Suspicious terminal probing)"
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={!manualIpInput.trim()}
                    className="w-full py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Block IP
                  </button>
                </div>
              </div>
            </form>

            {/* Blocked IP Table / Feed */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pb-1">
                <span>Active Quarantined IPs ({blockedIps.length})</span>
                {blockedIps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Unblock all IP addresses in the firewall list?')) {
                        blockedIps.forEach(b => unblockIpAddress(b.ip));
                        setBlockedIps([]);
                        refreshData();
                        if (onNotify) onNotify('All IP blocklist rules removed.');
                      }
                    }}
                    className="text-slate-400 hover:text-rose-500 text-[11px] transition-colors cursor-pointer"
                  >
                    Unblock All
                  </button>
                )}
              </div>

              {blockedIps.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No IP addresses are currently blocked.</p>
                </div>
              ) : (
                blockedIps.map((b) => (
                  <div
                    key={b.ip}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-rose-600 dark:text-rose-400">{b.ip}</span>
                        {b.autoBlockedByAi ? (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] border border-indigo-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-indigo-500" /> AI Auto-Block
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px] border border-amber-500/30">
                            Manual Block
                          </span>
                        )}
                        <span className="text-slate-400 text-[10.5px]">
                          {new Date(b.blockedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 truncate font-normal">
                        {b.reason}
                      </p>
                      {b.tenantName && (
                        <p className="text-[10.5px] text-slate-400">
                          Branch: {b.tenantName}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnblockIp(b.ip)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Unblock</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsFirewallModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
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
