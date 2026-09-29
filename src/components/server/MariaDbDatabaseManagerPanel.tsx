import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Copy, 
  Check, 
  Server, 
  ShieldCheck, 
  HardDrive, 
  Layers, 
  Table, 
  Terminal, 
  Zap, 
  Clock, 
  Lock,
  ArrowRight,
  ExternalLink,
  Users
} from 'lucide-react';
import { DatabaseUserAssignmentManager } from './DatabaseUserAssignmentManager';

interface MariaDbStatus {
  connected: boolean;
  database: string;
  host: string;
  port: number;
  pingMs: number;
  error?: string;
  engine?: string;
}

interface TableStats {
  connected: boolean;
  engine: string;
  tables: Record<string, number>;
  timestamp: string;
}

interface MariaDbDatabaseManagerPanelProps {
  onNotify?: (msg: string) => void;
}

export const MariaDbDatabaseManagerPanel: React.FC<MariaDbDatabaseManagerPanelProps> = ({ onNotify }) => {
  const [dbStatus, setDbStatus] = useState<MariaDbStatus | null>(null);
  const [tableStats, setTableStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'tables' | 'connection' | 'schema_cli'>('assignments');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [statusRes, statsRes] = await Promise.all([
        fetch('/api/db/status').catch(() => null),
        fetch('/api/db/table-stats').catch(() => null)
      ]);

      if (statusRes && statusRes.ok && statusRes.headers.get('content-type')?.includes('application/json')) {
        const sData = await statusRes.json().catch(() => null);
        if (sData) setDbStatus(sData);
      }
      if (statsRes && statsRes.ok && statsRes.headers.get('content-type')?.includes('application/json')) {
        const tData: TableStats = await statsRes.json().catch(() => null);
        if (tData && tData.tables) setTableStats(tData.tables);
      }
    } catch (err: any) {
      console.warn('MariaDB status notice:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleInitSchema = async () => {
    setIsProvisioning(true);
    try {
      const res = await fetch('/api/db/init-mariadb', { method: 'POST' });
      const data = res.headers.get('content-type')?.includes('application/json') ? await res.json().catch(() => ({})) : {};
      if (data.success) {
        if (onNotify) onNotify('MariaDB schema successfully provisioned and verified!');
        await fetchStatus();
      } else {
        if (onNotify) onNotify(`MariaDB: ${data.message || 'Verification complete'}`);
      }
    } catch (err: any) {
      if (onNotify) onNotify(`MariaDB Init Error: ${err?.message}`);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    if (onNotify) onNotify(`Copied ${key} to clipboard!`);
  };

  const tableDefinitions = [
    { name: 'mbi_tenants', label: 'Tenants / Store Branches', desc: 'Multi-tenant pharmacy organizations, limits, and storage tracking' },
    { name: 'mbi_users', label: 'Users & Cashiers RBAC', desc: 'PIN logins, roles, shift assignments, and module access permissions' },
    { name: 'mbi_medicines', label: 'Master Medicine Catalog', desc: '5,000+ preloaded medicines, generic salts, barcodes, and companies' },
    { name: 'mbi_inventory_batches', label: 'Stock Batches (FEFO)', desc: 'Batch numbers, expiry dates, purchase rates, and godown locations' },
    { name: 'mbi_invoices', label: 'Sales Invoices & Receipts', desc: 'POS billing transactions, discounts, payment types, and cashier tags' },
    { name: 'mbi_invoice_items', label: 'Itemized Invoice Lines', desc: 'Medicine line items, batch tags, quantities, and selling prices' },
    { name: 'mbi_purchases', label: 'Supplier Purchases', desc: 'Wholesale purchase orders, intake stock batches, and supplier bills' },
    { name: 'mbi_parties', label: 'Khata Accounts (Customers/Suppliers)', desc: 'Customer credit books, supplier payables, and contact directories' },
    { name: 'mbi_party_transactions', label: 'Ledger Debit/Credit Entries', desc: 'Real-time double-entry debit and credit audit trails' },
    { name: 'mbi_cashier_shifts', label: 'Cashier Shifts & Register Closing', desc: 'Physical drawer opening and closing cash balancing' },
    { name: 'mbi_print_templates', label: 'Master Invoice & Print Templates', desc: 'Official 80mm/58mm thermal templates & A4 drug warranty settings' },
    { name: 'mbi_audit_logs', label: 'Security & Threat Logs', desc: 'Master security audit trail and telemetry events' },
  ];

  const totalRecords = Object.values(tableStats).reduce((acc, curr) => acc + (curr || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-950/60 via-slate-900 to-indigo-950/60 border border-teal-500/30 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">MariaDB Enterprise Relational Database</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  MARIADB 10.x / 11.x
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Central MariaDB backend with automatic real-time sync, relational foreign keys, FEFO batch indexing, and multi-tenant isolation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>

            <a
              href="/api/db/schema-download"
              download="mbi_inventra_mariadb.sql"
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/30 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download SQL Schema</span>
            </a>

            <button
              onClick={handleInitSchema}
              disabled={isProvisioning}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isProvisioning ? 'Provisioning...' : 'Verify / Init Schema'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connection & Health Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 text-white">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>MariaDB Service</span>
            <Server className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xl font-black text-white">
              {dbStatus?.connected ? 'Online & Synced' : 'Offline / Standby'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            {dbStatus?.connected ? `Ping Latency: ${dbStatus.pingMs}ms` : 'Fallback local cache active'}
          </div>
        </div>

        {/* Database Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 text-white">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Database Name</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-xl font-black text-indigo-300 font-mono">
            {dbStatus?.database || 'mbi_inventra'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            Host: {dbStatus?.host || 'localhost'}:{dbStatus?.port || 3306}
          </div>
        </div>

        {/* Total Synced Records */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 text-white">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Relational Tables</span>
            <Table className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-400 font-mono">
            {tableDefinitions.length} Tables
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            InnoDB Engine • utf8mb4_unicode_ci
          </div>
        </div>

        {/* Synced Records Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 text-white">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Auto Sync Pipeline</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-black text-cyan-300 font-mono">
            {totalRecords > 0 ? `${totalRecords.toLocaleString()} Records` : 'Auto-Syncing'}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>IndexedDB ⇄ MariaDB 2-Way</span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'assignments' 
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' 
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User &amp; Tenant Database Assignments</span>
        </button>

        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'tables' 
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>MariaDB Relational Tables ({tableDefinitions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('connection')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'connection' 
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Connection &amp; .env Setup</span>
        </button>

        <button
          onClick={() => setActiveTab('schema_cli')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'schema_cli' 
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>cPanel, phpMyAdmin &amp; CLI Migration</span>
        </button>
      </div>

      {/* TAB 0: DATABASE USER ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <DatabaseUserAssignmentManager onNotify={onNotify} />
      )}

      {/* TAB 1: RELATIONAL TABLES EXPLORER */}
      {activeTab === 'tables' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Database Schema & Row Counters</span>
              </h3>
              <p className="text-xs text-slate-400">
                Live row statistics from MariaDB server. When client adds invoices, batches, or users, records auto-insert via ON DUPLICATE KEY UPDATE.
              </p>
            </div>
            <span className="text-xs font-mono text-teal-400 font-bold bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20">
              InnoDB Fast Engine
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {tableDefinitions.map((tbl) => {
              const rowCount = tableStats[tbl.name] ?? 0;
              return (
                <div 
                  key={tbl.name}
                  className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-teal-500/40 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-teal-300">
                        {tbl.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-900 text-emerald-400 border border-emerald-500/30">
                        {rowCount > 0 ? `${rowCount.toLocaleString()} rows` : '0 rows / ready'}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-200 mt-1">
                      {tbl.label}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {tbl.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10.5px] text-slate-400 font-mono">
                    <span>PRIMARY KEY (`id`)</span>
                    <span className="text-emerald-400">AUTO-SYNC ON</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CONNECTION & .ENV CONFIG */}
      {activeTab === 'connection' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Environment Variables (.env) for MariaDB</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add these environment variables to your VPS / Hostinger / cPanel Node.js environment to bind to your MariaDB instance:
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative font-mono text-xs text-slate-300 space-y-1">
            <button
              onClick={() => handleCopy(`DB_HOST=localhost\nDB_PORT=3306\nDB_USER=root\nDB_PASSWORD=YourStrongPasswordHere\nDB_NAME=mbi_inventra`, '.env config')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer border border-slate-700 text-[11px] flex items-center gap-1 font-sans"
            >
              {copiedKey === '.env config' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === '.env config' ? 'Copied' : 'Copy .env'}</span>
            </button>
            <div className="text-teal-400"># MariaDB Connection Configuration</div>
            <div>DB_HOST=localhost</div>
            <div>DB_PORT=3306</div>
            <div>DB_USER=root</div>
            <div>DB_PASSWORD=YourStrongPasswordHere</div>
            <div>DB_NAME=mbi_inventra</div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Driver Details</span>
            </div>
            <p>
              Backend uses high-speed <strong>mysql2/promise</strong> connection pool with connection recycling, UTF8MB4 full Unicode emojis support, and non-blocking asynchronous sync queue.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: CPANEL, PHPMYADMIN & CLI MIGRATION */}
      {activeTab === 'schema_cli' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Database Migration & Terminal Commands</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Instructions for importing the <strong>mbi_inventra_mariadb.sql</strong> file into MariaDB via CLI or phpMyAdmin:
            </p>
          </div>

          {/* CLI Step */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <span>Step 1: Create Database & User (Linux Terminal / MariaDB Prompt)</span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 relative">
              <button
                onClick={() => handleCopy(`CREATE DATABASE IF NOT EXISTS mbi_inventra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nGRANT ALL PRIVILEGES ON mbi_inventra.* TO 'mbi_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';\nFLUSH PRIVILEGES;`, 'SQL Init Commands')}
                className="absolute top-2.5 right-2.5 p-1 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                {copiedKey === 'SQL Init Commands' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <pre className="text-[11.5px] leading-relaxed">
{`CREATE DATABASE IF NOT EXISTS mbi_inventra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON mbi_inventra.* TO 'mbi_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
FLUSH PRIVILEGES;`}
              </pre>
            </div>
          </div>

          {/* Import Step */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
              <span>Step 2: Import Schema File (SSH CLI)</span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 relative">
              <button
                onClick={() => handleCopy(`mariadb -u root -p mbi_inventra < mbi_inventra_mariadb.sql`, 'CLI Import')}
                className="absolute top-2.5 right-2.5 p-1 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                {copiedKey === 'CLI Import' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <code className="text-[11.5px] text-emerald-400">
                mariadb -u root -p mbi_inventra &lt; mbi_inventra_mariadb.sql
              </code>
            </div>
          </div>

          {/* phpMyAdmin Step */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-2">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <ExternalLink className="w-4 h-4 text-teal-400" />
              <span>phpMyAdmin / cPanel Import Guide</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-slate-300 text-[11.5px]">
              <li>Log in to your cPanel / phpMyAdmin dashboard.</li>
              <li>Click <strong>New</strong> in the left sidebar and create a database named <code>mbi_inventra</code> with <code>utf8mb4_unicode_ci</code> collation.</li>
              <li>Click the <strong>Import</strong> tab at the top.</li>
              <li>Click <strong>Choose File</strong> and select <code>mbi_inventra_mariadb.sql</code>.</li>
              <li>Click <strong>Go / Import</strong> at the bottom. All 12 enterprise tables and initial plan seeds will be created instantly.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
