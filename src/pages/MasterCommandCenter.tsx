import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  KeyRound, 
  ShieldCheck, 
  Sliders, 
  Database, 
  Activity, 
  Settings, 
  Sun, 
  Moon, 
  Server, 
  Radio,
  ChevronRight,
  Sparkles,
  Search,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Send,
  ShoppingCart,
  ShieldAlert,
  HardDrive
} from 'lucide-react';
import { UltimateLicenseManager } from '../components/admin/UltimateLicenseManager';
import { LiveFleetMatrixStream } from '../components/admin/LiveFleetMatrixStream';
import { MasterGranularFeatureSwitchboard } from '../components/admin/MasterGranularFeatureSwitchboard';
import { DatabaseCloudVault } from '../components/admin/DatabaseCloudVault';
import { SystemHealthMonitor } from '../components/admin/SystemHealthMonitor';
import { MasterBroadcastCenterTab } from '../components/admin/MasterBroadcastCenterTab';
import { CheckoutLeadsTab } from '../components/admin/CheckoutLeadsTab';
import { MasterGlobalSearchBar } from '../components/admin/MasterGlobalSearchBar';
import { Master2faSettingsModal } from '../components/admin/Master2faSettingsModal';
import { adminService } from '../services/adminService';
import { emitToast } from '../contexts/ToastContext';

type ActiveMenuType = 'licenses' | 'fleet' | 'switchboard' | 'database' | 'health' | 'broadcast' | 'leads';

export const MasterCommandCenter: React.FC = () => {
  const navigate = useNavigate();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => adminService.isAuthenticated());
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Menu State
  const [activeMenu, setActiveMenu] = useState<ActiveMenuType>('licenses');

  // Modals State
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);

  // Dark/Light Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('mbi_server_theme') !== 'light';
  });

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('mbi_server_theme', next ? 'dark' : 'light');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await adminService.authenticateMasterAdmin(password, recoveryKey);
      if (res.success) {
        setIsAuthenticated(true);
        emitToast('Master Command Station Access Authorized', 'success');
      } else {
        setAuthError(res.error || 'Access Denied: Invalid Security Passcode');
      }
    } catch (err: any) {
      setAuthError('Authentication server offline or unreachable');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    adminService.logoutMasterAdmin();
    setIsAuthenticated(false);
    emitToast('Logged out of Master Command Center', 'info');
  };

  const navItems = [
    {
      id: 'licenses',
      label: 'License & Tenant HQ',
      subtitle: 'Key Generator & Quota Manager',
      icon: KeyRound,
      badge: 'Core'
    },
    {
      id: 'fleet',
      label: 'Live Fleet & Activity Matrix',
      subtitle: 'User Streams & HWID Bindings',
      icon: Radio,
      badge: 'Live'
    },
    {
      id: 'switchboard',
      label: 'Master Feature Switchboard',
      subtitle: '173 Remote Feature Controls',
      icon: Sliders,
      badge: 'Global'
    },
    {
      id: 'database',
      label: 'Database & Cloud Vault',
      subtitle: 'MariaDB mbi72dn & Backups',
      icon: Database,
      badge: 'Vault'
    },
    {
      id: 'health',
      label: 'System Health & Telemetry',
      subtitle: 'VPS Metrics & Rate Limits',
      icon: Activity,
      badge: 'Health'
    },
    {
      id: 'broadcast',
      label: 'Master Broadcast Center',
      subtitle: 'Global Notifications & Alerts',
      icon: Send,
      badge: 'Broadcast'
    },
    {
      id: 'leads',
      label: 'Checkout Leads & Orders',
      subtitle: 'Online Storefront Inquiries',
      icon: ShoppingCart,
      badge: 'Store'
    }
  ];

  // 1. AUTHENTICATION LOCK SCREEN
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-slate-950 text-white dark' : 'bg-slate-100 text-slate-900'}`}>
        <div className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl transition-all ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-3">
              <Server className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black tracking-tight">MBI INVENTRA MASTER SERVER</h1>
            <p className="text-xs text-slate-400 mt-1">
              Zero-Trust Super Control & Multi-Tenant Command Station
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Master Security Passcode</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Master Password..."
                  className={`w-full pl-4 pr-10 py-3 rounded-xl border text-xs font-medium outline-none transition-all ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Emergency Disaster Key <span className="text-[10px] text-slate-500">(Optional)</span>
              </label>
              <input
                type="password"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                placeholder="Disaster Recovery Key..."
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
            >
              {isAuthenticating ? 'Authorizing Security Handshake...' : 'Authenticate Master Access'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-inherit flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={() => navigate('/dashboard')}
              className="hover:text-blue-400 font-semibold cursor-pointer"
            >
              ← Back to Pharmacy POS
            </button>
            <span className="font-mono text-[10px] opacity-60">AES-256 GCM</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED MASTER COMMAND CENTER (LEFT SIDEBAR NAVIGATION)
  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside className={`w-72 border-r flex flex-col justify-between shrink-0 transition-colors duration-200 select-none ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          {/* Logo & Server Badge */}
          <div className="p-5 border-b border-inherit flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-sm tracking-tight flex items-center gap-1.5">
                  <span>MBI INVENTRA</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">v4.3</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Master Server Station</div>
              </div>
            </div>
          </div>

          {/* VPS Live Status Pill */}
          <div className="px-4 py-3">
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              isDarkMode ? 'bg-slate-800/60 border-slate-700/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold">MariaDB mbi72dn</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">ONLINE</span>
            </div>
          </div>

          {/* Navigation Menus */}
          <nav className="px-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id as ActiveMenuType)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-bold'
                      : isDarkMode
                      ? 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs leading-none font-bold">{item.label}</div>
                      <div className={`text-[10px] mt-1 leading-none ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 opacity-50 ${isActive ? 'opacity-100' : ''}`} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-inherit space-y-2">
          {/* 2FA Security Button */}
          <button
            onClick={() => setIs2faModalOpen(true)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Google 2FA Security</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">TOTP</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
            </div>
            <span className="text-[10px] uppercase font-bold opacity-60">{isDarkMode ? 'Dark' : 'Light'}</span>
          </button>

          {/* Logout / Exit Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Master Control</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT VIEW */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top App Bar with Global Search */}
        <header className={`px-8 py-4 border-b flex items-center justify-between gap-4 shrink-0 transition-colors ${
          isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex-1 max-w-xl">
            <MasterGlobalSearchBar isDarkMode={isDarkMode} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              Open Pharmacy POS →
            </button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          {activeMenu === 'licenses' && <UltimateLicenseManager isDarkMode={isDarkMode} />}
          {activeMenu === 'fleet' && <LiveFleetMatrixStream isDarkMode={isDarkMode} />}
          {activeMenu === 'switchboard' && <MasterGranularFeatureSwitchboard isDarkMode={isDarkMode} />}
          {activeMenu === 'database' && <DatabaseCloudVault isDarkMode={isDarkMode} />}
          {activeMenu === 'health' && <SystemHealthMonitor isDarkMode={isDarkMode} />}
          {activeMenu === 'broadcast' && <MasterBroadcastCenterTab isDarkMode={isDarkMode} />}
          {activeMenu === 'leads' && <CheckoutLeadsTab />}
        </div>
      </main>

      {/* Google 2FA Modal */}
      {is2faModalOpen && (
        <Master2faSettingsModal
          isOpen={is2faModalOpen}
          onClose={() => setIs2faModalOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}

    </div>
  );
};
