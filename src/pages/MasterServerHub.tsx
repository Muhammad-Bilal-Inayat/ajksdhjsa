import React, { useState, useEffect } from 'react';
import { 
  Building2, Key, Users, Database, Eye, ShieldCheck, 
  Lock, ArrowLeft, RefreshCw, Power, Server, Sparkles, 
  Terminal, CheckCircle2, ChevronRight, Activity, ShieldAlert,
  Bot, Smartphone, FileText, Settings, Globe, BarChart3,
  HardDrive, Radio, Layers, Wifi, DollarSign, Search,
  Printer, Code2, BookOpen, TrendingUp, Archive, LockKeyhole,
  Download, Zap, HelpCircle, UserCheck, AlertTriangle, RotateCcw,
  Sun, Moon, Menu, X, Sliders, ToggleLeft, ToggleRight, Check
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Modular Server Components
import { ClientFleetDashboard } from '../components/server/ClientFleetDashboard';
import { UnifiedUserControlHub } from '../components/server/UnifiedUserControlHub';
import { AiSupportModule } from '../components/server/AiSupportModule';
import { DeviceAuthorizationManagerPanel } from '../components/server/DeviceAuthorizationManagerPanel';
import { SecurityAuditLogPanel } from '../components/server/SecurityAuditLogPanel';
import { WhatsAppLeadsManagerPanel } from '../components/admin/WhatsAppLeadsManagerPanel';
import { MasterControlSection } from '../components/admin/MasterControlSection';
import { MariaDbDatabaseManagerPanel } from '../components/server/MariaDbDatabaseManagerPanel';
import { MedicineDatabaseInitializationPanel } from '../components/server/MedicineDatabaseInitializationPanel';
import { SiteCmsEditorPanel } from '../components/server/SiteCmsEditorPanel';
import { SoftwareSalesRevenueDashboard } from '../components/server/SoftwareSalesRevenueDashboard';
import { TenantStorageMonitor } from '../components/server/TenantStorageMonitor';
import { SyncHealthVisualizer } from '../components/server/SyncHealthVisualizer';
import { UserSyncTelemetrySection } from '../components/server/UserSyncTelemetrySection';
import { ServerActivityFeedPanel } from '../components/server/ServerActivityFeedPanel';
import { SyncDiagnosticStatusCard } from '../components/server/SyncDiagnosticStatusCard';
import { PlanPricingManagerPanel } from '../components/server/PlanPricingManagerPanel';
import { SecurityAlertsWidget } from '../components/server/SecurityAlertsWidget';
import { MasterPrinterTemplatesPanel } from '../components/server/MasterPrinterTemplatesPanel';
import { DeveloperVaultPanel } from '../components/server/DeveloperVaultPanel';
import { ServerDocumentationPanel } from '../components/server/ServerDocumentationPanel';
import { LicenseVaultModule } from '../components/server/LicenseVaultModule';
import { DatabaseDiagnosticsModule } from '../components/server/DatabaseDiagnosticsModule';
import { StealthShadowModule } from '../components/server/StealthShadowModule';
import { ServerGlobalSearch } from '../components/server/ServerGlobalSearch';
import { Master2faSettingsModal } from '../components/admin/Master2faSettingsModal';
import { verifyTotpToken } from '../services/totpService';

export type ServerTabKey = 
  | 'master_super'
  | 'users_control'
  | 'ai_support'
  | 'clients'
  | 'devices'
  | 'security_audit'
  | 'whatsapp_leads'
  | 'master_control'
  | 'database'
  | 'site_cms'
  | 'sales_revenue'
  | 'storage'
  | 'sync_health'
  | 'sync_stream'
  | 'activity'
  | 'cloud_health'
  | 'pricing_manager'
  | 'seo_strategy'
  | 'security_alerts'
  | 'printer_templates'
  | 'developer_vault'
  | 'docs'
  | 'ai_forecasting'
  | 'backup_vault'
  | 'custom_domains';

interface TabDefinition {
  id: ServerTabKey;
  label: string;
  category: 'Core Fleet' | 'Security & Users' | 'System & Sync' | 'Commerce & CMS' | 'Dev & Tools';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const ALL_25_TABS: TabDefinition[] = [
  // 1. Core Fleet
  { id: 'master_super', label: 'Master Super Control', category: 'Core Fleet', icon: ShieldCheck, description: 'Global tenant controls & emergency remote lock' },
  { id: 'clients', label: 'Client Fleet Dashboard', category: 'Core Fleet', icon: Building2, description: 'Multi-company isolation & active pharmacy stores' },
  { id: 'whatsapp_leads', label: 'WhatsApp Trial Leads', category: 'Core Fleet', icon: Smartphone, description: 'Registration leads & 1-click WhatsApp dispatch' },
  { id: 'sales_revenue', label: 'Software Revenue & GMV', category: 'Core Fleet', icon: BarChart3, description: 'Software license subscriptions & transaction volume' },
  { id: 'pricing_manager', label: 'SaaS Pricing & Plans', category: 'Core Fleet', icon: DollarSign, description: 'Configure Basic, Business & Enterprise tiers' },

  // 2. Security & Users
  { id: 'users_control', label: 'Unified User Governance', category: 'Security & Users', icon: Users, description: 'All staff accounts, passcodes & live heartbeat' },
  { id: 'devices', label: 'Device & Hardware Bindings', category: 'Security & Users', icon: Key, description: 'Hardware 1-device MAC/HWID whitelist & Laptop Transfer' },
  { id: 'security_audit', label: 'Security Audit Trail', category: 'Security & Users', icon: FileText, description: 'Suspicious logins, violation logs & IP blacklist' },
  { id: 'security_alerts', label: 'Threats & Brute-Force Alerts', category: 'Security & Users', icon: ShieldAlert, description: 'Real-time threat detection & intrusion prevention' },
  { id: 'activity', label: 'Active Terminal Sessions', category: 'Security & Users', icon: Radio, description: 'Live cashiers, active IP addresses & heartbeats' },

  // 3. System & Sync
  { id: 'sync_health', label: 'Sync Health & 30-Day SLA', category: 'System & Sync', icon: Wifi, description: '30-day sync uptime percentage & ping diagnostics' },
  { id: 'sync_stream', label: 'Real-Time SSE Stream', category: 'System & Sync', icon: Activity, description: 'Live Server-Sent Events bus telemetry' },
  { id: 'cloud_health', label: 'Cloud Probes & Queue', category: 'System & Sync', icon: Server, description: 'MariaDB connection latency & queue health' },
  { id: 'storage', label: 'Disk Space & Partitions', category: 'System & Sync', icon: HardDrive, description: 'MariaDB mbi72dn storage usage & vacuuming' },
  { id: 'backup_vault', label: 'Backup Vault & Disaster Recovery', category: 'System & Sync', icon: Archive, description: 'Midnight automated snapshots & 1-click disaster recovery' },

  // 4. Commerce & CMS
  { id: 'master_control', label: '173 Feature Switchboard', category: 'Commerce & CMS', icon: Settings, description: 'Global and tenant-wise enterprise feature toggles' },
  { id: 'database', label: 'Database & Catalog Seeder', category: 'Commerce & CMS', icon: Database, description: '15,000+ Pakistani pharma catalog & DDL migrations' },
  { id: 'site_cms', label: 'Public Site & CMS Editor', category: 'Commerce & CMS', icon: Globe, description: 'Landing page editor, banners & announcements' },
  { id: 'printer_templates', label: 'Master Printer Presets', category: 'Commerce & CMS', icon: Printer, description: '80mm/58mm thermal receipts & A4 tax invoices' },
  { id: 'custom_domains', label: 'White-Label Domains', category: 'Commerce & CMS', icon: Layers, description: 'Map pharmacy subdomains & custom DNS' },

  // 5. Dev & Tools
  { id: 'ai_support', label: 'AI Support & Human Takeover', category: 'Dev & Tools', icon: Bot, description: 'Live client inquiries & AI bot assistance' },
  { id: 'developer_vault', label: 'Developer Vault & Patches', category: 'Dev & Tools', icon: Code2, description: 'System environment flags & hotpatch releases' },
  { id: 'ai_forecasting', label: 'AI Stock Forecasting', category: 'Dev & Tools', icon: TrendingUp, description: 'Predictive depletion speed & auto-reorder recommendations' },
  { id: 'seo_strategy', label: 'SEO & Rich Snippets', category: 'Dev & Tools', icon: Sparkles, description: 'JSON-LD schema & social preview cards' },
  { id: 'docs', label: 'Architecture Docs & SOPs', category: 'Dev & Tools', icon: BookOpen, description: 'Complete system manuals, shortcuts & protocols' }
];

export function MasterServerHub() {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('mbi_master_session_unlocked') === 'true';
  });
  const [loginStep, setLoginStep] = useState<'password' | 'totp'>('password');
  const [pinInput, setPinInput] = useState('');
  const [totpInput, setTotpInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<ServerTabKey>('master_super');
  const [tabSearch, setTabSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Theme state: dark / light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('mbi_server_theme') as 'dark' | 'light') || 'dark';
  });

  // Collapsible Operations Sidebar / Menu
  const [isOpsMenuOpen, setIsOpsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Quick Action Modal states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [isTotpModalOpen, setIsTotpModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [executingAction, setExecutingAction] = useState(false);

  const navigate = useNavigate();

  const handleReturnToWorkspace = () => {
    const isAuth = !!localStorage.getItem('mbi_active_user') || 
                   !!localStorage.getItem('mbi_active_token') || 
                   !!localStorage.getItem('mbi_active_business_id');
    if (isAuth) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('mbi_server_theme', next);
  };

  // Listen to custom tab navigation events
  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e?.detail) setActiveTab(e.detail);
    };
    window.addEventListener('mbi-set-server-tab' as any, handleSetTab);
    return () => window.removeEventListener('mbi-set-server-tab' as any, handleSetTab);
  }, []);

  const get2faConfig = () => {
    try {
      const stored = localStorage.getItem('mbi_master_2fa_config');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { enabled: false, secret: '', emergencyKey: '03082003' };
  };

  const handleUnlockStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    const cleanPin = pinInput.trim();
    if (!cleanPin) {
      setPinError('Please enter Master Password or Recovery Key');
      return;
    }

    // Emergency direct recovery key bypasses all
    if (cleanPin === '03082003') {
      sessionStorage.setItem('mbi_master_session_unlocked', 'true');
      setUnlocked(true);
      return;
    }

    let isPasswordValid = false;
    if (cleanPin === 'Ami7788!@') {
      isPasswordValid = true;
    } else {
      try {
        const res = await fetch('/api/master/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: cleanPin })
        });
        const data = await res.json();
        if (data.success) isPasswordValid = true;
      } catch {}
    }

    if (!isPasswordValid) {
      setPinError('Access Denied: Invalid Master Credentials');
      return;
    }

    // Check if 2FA is active
    let config2fa = get2faConfig();
    try {
      const res2fa = await fetch('/api/admin/system/master-2fa-config');
      if (res2fa.ok) {
        const data2fa = await res2fa.json();
        if (data2fa.config) config2fa = data2fa.config;
      }
    } catch {}

    if (config2fa && config2fa.enabled && config2fa.secret) {
      // Transition to Step 2: Google Authenticator TOTP
      setLoginStep('totp');
      setTotpInput('');
      setPinError('');
    } else {
      // 2FA is OFF - Complete unlock
      sessionStorage.setItem('mbi_master_session_unlocked', 'true');
      setUnlocked(true);
    }
  };

  const handleUnlockStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    const cleanTotp = totpInput.trim();
    if (!cleanTotp) {
      setPinError('Please enter 6-digit Google Authenticator code');
      return;
    }

    // Emergency bypass key
    if (cleanTotp === '03082003') {
      sessionStorage.setItem('mbi_master_session_unlocked', 'true');
      setUnlocked(true);
      return;
    }

    const config2fa = get2faConfig();
    let isTotpValid = false;

    if (config2fa && config2fa.secret) {
      isTotpValid = await verifyTotpToken(cleanTotp, config2fa.secret);
    }

    if (!isTotpValid) {
      try {
        const res = await fetch('/api/admin/system/verify-master-2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cleanTotp })
        });
        if (res.ok) isTotpValid = true;
      } catch {}
    }

    if (isTotpValid) {
      sessionStorage.setItem('mbi_master_session_unlocked', 'true');
      setUnlocked(true);
    } else {
      setPinError('Invalid 6-digit code. Check your Google Authenticator app.');
    }
  };

  const handleNotify = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4500);
  };

  // 1. Quick Action: Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasscode) return;
    setExecutingAction(true);
    try {
      const res = await fetch('/api/master/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-master-pin': 'Ami7788!@' },
        body: JSON.stringify({ newPin: newPasscode })
      });
      const data = await res.json();
      if (data.success) {
        setIsPasswordModalOpen(false);
        setNewPasscode('');
        handleNotify('Master password updated successfully across MariaDB mbi72dn.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExecutingAction(false);
    }
  };

  // 2. Quick Action: Force Full Sync
  const handleForceSync = async () => {
    setExecutingAction(true);
    try {
      const res = await fetch('/api/master/force-sync', {
        method: 'POST',
        headers: { 'x-master-pin': 'Ami7788!@' }
      });
      const data = await res.json();
      handleNotify(data.message || 'Global synchronization broadcast completed.');
    } catch (err: any) {
      handleNotify('Sync trigger failed: ' + err?.message);
    } finally {
      setExecutingAction(false);
    }
  };

  // 3. Quick Action: Instant SQL Backup
  const handleInstantBackup = () => {
    window.open('/api/master/backup/export-sql', '_blank');
    handleNotify('Database SQL backup archive download initiated.');
  };

  // 4. Quick Action: Emergency Global Lock
  const handleEmergencyLock = async () => {
    if (!window.confirm('CRITICAL ACTION: This will activate the kill switch for all cashier and staff accounts across all pharmacy stores. Proceed?')) {
      return;
    }
    setExecutingAction(true);
    try {
      const res = await fetch('/api/master/emergency-lock', {
        method: 'POST',
        headers: { 'x-master-pin': 'Ami7788!@' }
      });
      const data = await res.json();
      handleNotify(data.message || 'Emergency Lock executed.');
    } catch (err: any) {
      handleNotify('Lockout failed: ' + err?.message);
    } finally {
      setExecutingAction(false);
    }
  };

  // 5. Quick Action: Midnight Cron Snapshot Trigger
  const handleMidnightCron = async () => {
    setExecutingAction(true);
    try {
      const res = await fetch('/api/master/backup/midnight-cron', {
        method: 'POST',
        headers: { 'x-master-pin': 'Ami7788!@' }
      });
      const data = await res.json();
      handleNotify(data.message || 'Midnight Automated Snapshots generated successfully.');
    } catch (err: any) {
      handleNotify('Midnight cron failed: ' + err?.message);
    } finally {
      setExecutingAction(false);
    }
  };

  // Filter tabs by search or category
  const filteredTabs = ALL_25_TABS.filter(t => {
    const matchQ = t.label.toLowerCase().includes(tabSearch.toLowerCase()) || 
                   t.description.toLowerCase().includes(tabSearch.toLowerCase()) ||
                   t.id.toLowerCase().includes(tabSearch.toLowerCase());
    const matchC = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchQ && matchC;
  });

  // Secure PIN Unlock Screen (No plain text passwords displayed anywhere)
  if (!unlocked) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col justify-center items-center px-4 py-12 select-none`}>
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-blue-600 border border-indigo-500/40 flex items-center justify-center mx-auto text-white shadow-xl shadow-indigo-500/10">
              <Server className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              MBI INVENTRA 
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Master Command Center & Fleet Operations Hub
            </p>
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5`}>
            {loginStep === 'password' ? (
              <>
                <div className="flex items-center gap-2 text-xs font-bold pb-3 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  <span>Step 1: Enter Master Password</span>
                </div>

                {pinError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-300 text-xs font-bold">
                    {pinError}
                  </div>
                )}

                <form onSubmit={handleUnlockStep1} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      autoFocus
                      placeholder="••••••••••••"
                      value={pinInput}
                      onChange={e => {
                        setPinInput(e.target.value);
                        setPinError('');
                      }}
                      className={`w-full text-center text-lg tracking-widest px-4 py-3.5 rounded-2xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'} font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    Proceed &gt;
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs font-bold pb-3 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span>Step 2: Enter Google Authenticator 6-Digit Code</span>
                </div>

                {pinError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-300 text-xs font-bold">
                    {pinError}
                  </div>
                )}

                <form onSubmit={handleUnlockStep2} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      maxLength={8}
                      autoFocus
                      placeholder="123456"
                      value={totpInput}
                      onChange={e => {
                        setTotpInput(e.target.value);
                        setPinError('');
                      }}
                      className={`w-full text-center text-2xl tracking-[0.4em] font-black px-4 py-3.5 rounded-2xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-950 text-emerald-400' : 'border-slate-200 bg-slate-50 text-emerald-600'} font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    Verify &amp; Unlock Master Hub
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('password');
                      setPinError('');
                    }}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-300 cursor-pointer pt-1"
                  >
                    &larr; Back to Step 1
                  </button>
                </form>
              </>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleReturnToWorkspace}
                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Return to Pharmacy Workspace</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Tab Component Renderer
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'master_super':
        return (
          <div className="space-y-6">
            <MasterControlSection />
          </div>
        );
      case 'users_control':
        return <UnifiedUserControlHub onNotify={handleNotify} />;
      case 'ai_support':
        return <AiSupportModule />;
      case 'clients':
        return <ClientFleetDashboard onNotify={handleNotify} />;
      case 'devices':
        return <DeviceAuthorizationManagerPanel />;
      case 'security_audit':
        return <SecurityAuditLogPanel />;
      case 'whatsapp_leads':
        return <WhatsAppLeadsManagerPanel showToast={(msg: string) => handleNotify(msg)} />;
      case 'master_control':
        return <MasterControlSection />;
      case 'database':
        return (
          <div className="space-y-6">
            <MariaDbDatabaseManagerPanel />
            <MedicineDatabaseInitializationPanel />
          </div>
        );
      case 'site_cms':
        return <SiteCmsEditorPanel />;
      case 'sales_revenue':
        return <SoftwareSalesRevenueDashboard />;
      case 'storage':
        return <TenantStorageMonitor onNotify={handleNotify} />;
      case 'sync_health':
        return <SyncHealthVisualizer onNotify={handleNotify} />;
      case 'sync_stream':
        return (
          <UserSyncTelemetrySection 
            invoices={[]} 
            medicines={[]} 
            onNotify={handleNotify}
            onOpenGranularModal={() => {}}
            onOpenResetPasscodeModal={() => {}}
          />
        );
      case 'activity':
        return <ServerActivityFeedPanel onNotify={handleNotify} />;
      case 'cloud_health':
        return <SyncDiagnosticStatusCard />;
      case 'pricing_manager':
        return <PlanPricingManagerPanel />;
      case 'seo_strategy':
        return <SiteCmsEditorPanel />;
      case 'security_alerts':
        return <SecurityAlertsWidget />;
      case 'printer_templates':
        return <MasterPrinterTemplatesPanel />;
      case 'developer_vault':
        return <DeveloperVaultPanel />;
      case 'docs':
        return <ServerDocumentationPanel />;
      case 'ai_forecasting':
        return (
          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-3xl p-8 text-center space-y-4`}>
            <TrendingUp className="w-12 h-12 text-indigo-500 mx-auto" />
            <h3 className="text-base font-bold">AI Predictive Stock Depletion Engine</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Real-time machine learning analyzing seasonal demand patterns, fast-moving antibiotics, and automated reorder points across all connected pharmacy stores.
            </p>
          </div>
        );
      case 'backup_vault':
        return (
          <div className="space-y-6">
            {/* Midnight Backup Banner Card */}
            <div className={`p-6 rounded-3xl ${theme === 'dark' ? 'bg-gradient-to-r from-indigo-950/80 to-slate-900 border-indigo-500/30' : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'} border flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-white">
                  <Archive className="w-5 h-5 text-indigo-500" />
                  <span>Midnight Automated Disaster Recovery Cron</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                  Automated 12:00 AM encrypted per-tenant snapshots are archived daily on MariaDB <code className="text-indigo-600 dark:text-indigo-400 font-mono">mbi72dn</code>. When a client replaces a stolen or damaged laptop, their latest snapshot restores automatically with ZERO data loss.
                </p>
              </div>
              <button
                type="button"
                disabled={executingAction}
                onClick={handleMidnightCron}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <RefreshCw className={`w-4 h-4 ${executingAction ? 'animate-spin' : ''}`} />
                <span>Run Midnight Backup Now</span>
              </button>
            </div>
            <DatabaseDiagnosticsModule />
          </div>
        );
      case 'custom_domains':
        return (
          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-3xl p-8 text-center space-y-4`}>
            <Layers className="w-12 h-12 text-blue-500 mx-auto" />
            <h3 className="text-base font-bold">White-Label Custom Subdomain Router</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Assign dedicated subdomains (e.g., <code className="text-blue-500 font-mono">pos.alshafipharmacy.com</code>) mapped to client company tenant IDs with automated SSL provisioning.
            </p>
          </div>
        );
      default:
        return <ClientFleetDashboard onNotify={handleNotify} />;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Engineering App Bar with Dedicated Global Search & Light/Dark Mode */}
      <header className={`border-b ${theme === 'dark' ? 'border-slate-800/80 bg-slate-900/80' : 'border-slate-200 bg-white/90'} backdrop-blur-lg sticky top-0 z-40 px-4 sm:px-8 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs`}>
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-500/20">
              M4
            </div>
            <div>
              <div className="text-sm font-extrabold flex items-center gap-2">
                <span>MBI INVENTRA </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  MASTER HUB
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>MariaDB: <code className="font-mono text-slate-700 dark:text-slate-300">mbi72dn</code></span>
                </span>
                <span>•</span>
                <span>25 Fleet Tabs</span>
              </div>
            </div>
          </div>

          {/* Mobile Operations Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <button
              type="button"
              onClick={() => setIsOpsMenuOpen(!isOpsMenuOpen)}
              className="p-2 rounded-xl bg-indigo-600 text-white"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Server Search Bar */}
        <div className="flex-1 max-w-xl mx-0 md:mx-4">
          <ServerGlobalSearch onSelectTab={tab => setActiveTab(tab)} onNotify={handleNotify} />
        </div>

        <div className="hidden md:flex items-center gap-2.5 justify-end">
          {/* Light/Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'} cursor-pointer transition-colors`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Collapsible Quick Operations Dropdown Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpsMenuOpen(!isOpsMenuOpen)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs ${
                isOpsMenuOpen
                  ? 'bg-indigo-600 text-white'
                  : theme === 'dark' ? 'border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Operations Menu</span>
            </button>

            {/* Operations Dropdown Panel */}
            {isOpsMenuOpen && (
              <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'} p-3 z-50 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/80`}>
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Server Actions
                </div>
                <div className="pt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => { setIsPasswordModalOpen(true); setIsOpsMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    <span>Change Master Passcode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setIsTotpModalOpen(true); setIsOpsMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                  >
                    <LockKeyhole className="w-3.5 h-3.5 text-blue-500" />
                    <span>2FA TOTP Guard</span>
                  </button>

                  <button
                    type="button"
                    disabled={executingAction}
                    onClick={() => { handleForceSync(); setIsOpsMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Force Full Cloud Sync</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { handleInstantBackup(); setIsOpsMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Download Raw SQL Dump (.sql)</span>
                  </button>

                  <button
                    type="button"
                    disabled={executingAction}
                    onClick={() => { handleEmergencyLock(); setIsOpsMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left cursor-pointer disabled:opacity-50"
                  >
                    <Power className="w-3.5 h-3.5 text-rose-600" />
                    <span>Emergency Remote Lock</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleReturnToWorkspace}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border ${theme === 'dark' ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800'} text-xs font-bold transition-colors cursor-pointer`}
          >
            <span>User Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('mbi_master_session_unlocked');
              setUnlocked(false);
            }}
            className={`p-2.5 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'} cursor-pointer transition-colors`}
            title="Lock Hub"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="sticky top-14 z-30 px-4 sm:px-8 py-2 bg-indigo-600/90 backdrop-blur-sm text-white text-xs font-bold text-center shadow-md flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Tabs Selector & Search Header */}
      <div className={`border-b ${theme === 'dark' ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-200 bg-slate-100/70'} px-4 sm:px-8 py-3 space-y-3`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'Core Fleet', 'Security & Users', 'System & Sync', 'Commerce & CMS', 'Dev & Tools'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : theme === 'dark' ? 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Filter */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter 25 master tabs..."
              value={tabSearch}
              onChange={e => setTabSearch(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-200 bg-white text-slate-800'} text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium`}
            />
          </div>
        </div>

        {/* 25 Horizontal Tabs Pill Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {filteredTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-500/40 shadow-sm'
                    : theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={t.description}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-20">
        {renderActiveTabContent()}
      </main>

      {/* Modal: Change Password */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <span>Update Master Passcode</span>
              </h3>
              <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">New Master Passcode *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newPasscode}
                  onChange={e => setNewPasscode(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'} text-xs font-mono`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={executingAction}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Save Passcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Master 2FA Google Authenticator */}
      <Master2faSettingsModal
        isOpen={isTotpModalOpen}
        onClose={() => setIsTotpModalOpen(false)}
      />
    </div>
  );
}
