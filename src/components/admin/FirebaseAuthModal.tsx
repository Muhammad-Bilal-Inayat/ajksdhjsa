import React, { useState } from 'react';
import { 
  X, Shield, Mail, Lock, User, Cloud, CheckCircle2, 
  AlertCircle, LogOut, ArrowRight, Database, RefreshCw, 
  ExternalLink, Sparkles, KeyRound, Server
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dbMedicines, dbInvoices, dbPurchaseOrders, dbSuppliers, dbPartyPayments, dbExpenses } from '../../lib/db';
import { postgresApiClient } from '../../lib/postgresApiClient';

interface FirebaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    firebaseUser, 
    userProfile, 
    business, 
    activeRole,
    loginEmailPass, 
    registerEmailPass, 
    logout 
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncStats, setCloudSyncStats] = useState<{ total: number; uploaded: number } | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginEmailPass(email, password);
        setSuccessMsg('Logged in successfully!');
      } else {
        await registerEmailPass(email, password);
        setSuccessMsg('Account registered successfully!');
      }
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloudDataUpload = async () => {
    setIsCloudSyncing(true);
    setError(null);
    try {
      const [meds, invs, pos, sups, pays, exps] = await Promise.all([
        dbMedicines.getAll().catch(() => []),
        dbInvoices.getAll().catch(() => []),
        dbPurchaseOrders.getAll().catch(() => []),
        dbSuppliers.getAll().catch(() => []),
        dbPartyPayments.getAll().catch(() => []),
        dbExpenses.getAll().catch(() => []),
      ]);

      const allItems = [
        ...meds.map(m => ({ col: 'medicines', id: m.id, data: m })),
        ...invs.map(i => ({ col: 'invoices', id: i.id, data: i })),
        ...pos.map(p => ({ col: 'purchaseOrders', id: p.id, data: p })),
        ...sups.map(s => ({ col: 'suppliers', id: s.id, data: s })),
        ...pays.map(p => ({ col: 'partyPayments', id: p.id, data: p })),
        ...exps.map(e => ({ col: 'expenses', id: e.id, data: e })),
      ];

      setCloudSyncStats({ total: allItems.length, uploaded: 0 });

      let count = 0;
      for (const item of allItems) {
        await postgresApiClient.syncOperation(item.col, item.id, 'CREATE', item.data);
        count++;
        setCloudSyncStats({ total: allItems.length, uploaded: count });
      }

      setSuccessMsg(`Successfully synchronized ${count} local records to PostgreSQL Central Database!`);
    } catch (err: any) {
      setError(err?.message || 'Failed to synchronize records to Central Database.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Server Account Authentication</h3>
              <p className="text-[11px] text-slate-400">PostgreSQL Cloud & Multi-Device Sync</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {firebaseUser ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
                    {firebaseUser.displayName?.charAt(0).toUpperCase() || firebaseUser.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-900 truncate">
                      {firebaseUser.displayName || 'Authorized Server User'}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">{firebaseUser.email}</p>
                    <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Active Cloud Session
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={logout}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>

              {/* Data Migration Push */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-blue-600" />
                      Central PostgreSQL Sync
                    </p>
                    <p className="text-slate-500 text-[11px]">Synchronize local offline records with Central Database</p>
                  </div>

                  <button
                    onClick={handleCloudDataUpload}
                    disabled={isCloudSyncing}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                    {isCloudSyncing ? 'Syncing...' : 'Sync to Cloud'}
                  </button>
                </div>

                {cloudSyncStats && (
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${(cloudSyncStats.uploaded / (cloudSyncStats.total || 1)) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="email"
                      required
                      placeholder="admin@mbinventra.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Processing...' : mode === 'login' ? 'Sign In to Server' : 'Create Server Account'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="text-center pt-2">
                {mode === 'login' ? (
                  <p className="text-xs text-slate-500">
                    Need a new user profile?{' '}
                    <button 
                      type="button" 
                      onClick={() => setMode('register')} 
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Register New User
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Already registered?{' '}
                    <button 
                      type="button" 
                      onClick={() => setMode('login')} 
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
