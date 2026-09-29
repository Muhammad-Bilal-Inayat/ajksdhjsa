import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Users, UserCheck, Plus, Trash2, Edit3, ShieldCheck, 
  Server, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, 
  Search, Lock, Check, Zap, HardDrive, Key, Layers
} from 'lucide-react';
import { getAllTenants, getMasterActiveUsers, MasterActiveUser, Tenant } from '../../lib/masterServerService';

export interface DatabaseAssignment {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole: string;
  tenantId: string;
  tenantName: string;
  dbNodeId: string;
  dbNodeName: string;
  accessPrivilege: 'READ_WRITE' | 'READ_ONLY' | 'FULL_ADMIN' | 'ISOLATED_SCHEMA';
  assignedAt: string;
  status: 'ACTIVE' | 'PAUSED' | 'SYNCED';
  notes?: string;
}

const DB_ASSIGNMENTS_KEY = 'mbi_master_db_user_assignments_v1';

export const DB_NODES = [
  { id: 'mariadb_primary', name: 'MariaDB Primary Cluster (Port 3306 / Hostinger)', host: 'localhost:3306', status: 'ONLINE', capacity: '500 GB' },
  { id: 'cloud_sync_mem', name: 'Cloud In-Memory Sync Engine (Sub-ms Latency)', host: '0.0.0.0:3000', status: 'ONLINE', capacity: '100 GB' },
  { id: 'replica_shard_01', name: 'Secondary Read Replica / Shard 01 (Backup)', host: 'replica-1.mbi.internal', status: 'ONLINE', capacity: '1 TB' },
  { id: 'isolated_tenant_vault', name: 'Dedicated Encrypted Tenant Vault (High Security)', host: 'vault-isolated.mbi.cloud', status: 'ONLINE', capacity: '250 GB' },
];

export const DatabaseUserAssignmentManager: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [assignments, setAssignments] = useState<DatabaseAssignment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<MasterActiveUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNodeFilter, setSelectedNodeFilter] = useState<string>('ALL');

  // New Assignment Modal / Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDbNodeId, setSelectedDbNodeId] = useState<string>('mariadb_primary');
  const [selectedPrivilege, setSelectedPrivilege] = useState<DatabaseAssignment['accessPrivilege']>('READ_WRITE');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load data from localStorage & Server API
  const loadAssignmentsData = async () => {
    setLoading(true);
    try {
      const allT = getAllTenants();
      setTenants(allT);
      const allU = getMasterActiveUsers();
      setUsers(allU);

      // Try fetching from server first
      let loaded: DatabaseAssignment[] = [];
      try {
        const res = await fetch('/api/master/db-assignments');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.assignments)) {
            loaded = data.assignments;
          }
        }
      } catch (err) {
        // Fallback to local
      }

      if (loaded.length === 0) {
        const raw = localStorage.getItem(DB_ASSIGNMENTS_KEY);
        if (raw) {
          loaded = JSON.parse(raw);
        } else {
          // Default initial assignments
          loaded = [
            {
              id: 'dba_001',
              userId: 'u1',
              userName: 'Primary Store Admin',
              userEmail: 'vip123@admin.com',
              userRole: 'Primary Admin',
              tenantId: 'tenant-demo-01',
              tenantName: 'Al-Madina Pharmacy & Store',
              dbNodeId: 'mariadb_primary',
              dbNodeName: 'MariaDB Primary Cluster (Port 3306 / Hostinger)',
              accessPrivilege: 'FULL_ADMIN',
              assignedAt: new Date().toISOString(),
              status: 'ACTIVE',
              notes: 'Full Read/Write and DDL permissions'
            },
            {
              id: 'dba_002',
              userId: 'usr_cashier_01',
              userName: 'Counter Cashier 1',
              userEmail: 'cashier@almadina.com',
              userRole: 'Cashier',
              tenantId: 'tenant-demo-01',
              tenantName: 'Al-Madina Pharmacy & Store',
              dbNodeId: 'cloud_sync_mem',
              dbNodeName: 'Cloud In-Memory Sync Engine (Sub-ms Latency)',
              accessPrivilege: 'READ_WRITE',
              assignedAt: new Date().toISOString(),
              status: 'ACTIVE',
              notes: 'Scoped to POS billing and quick invoice creation'
            }
          ];
          localStorage.setItem(DB_ASSIGNMENTS_KEY, JSON.stringify(loaded));
        }
      }

      setAssignments(loaded);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignmentsData();
  }, []);

  const saveAssignments = async (newList: DatabaseAssignment[]) => {
    setAssignments(newList);
    localStorage.setItem(DB_ASSIGNMENTS_KEY, JSON.stringify(newList));
    window.dispatchEvent(new CustomEvent('mbi-db-assignments-updated', { detail: newList }));

    // Sync to backend endpoint asynchronously
    try {
      await fetch('/api/master/db-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: newList })
      });
    } catch (e) {}
  };

  // Handle Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert('Please select a user to assign.');
      return;
    }

    setIsSaving(true);

    const targetUser = users.find(u => u.id === selectedUserId);
    const targetTenant = tenants.find(t => t.id === targetUser?.installationId || t.tenantId === targetUser?.installationId) || tenants[0];
    const targetNode = DB_NODES.find(n => n.id === selectedDbNodeId) || DB_NODES[0];

    const newAssignment: DatabaseAssignment = {
      id: `dba_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: selectedUserId,
      userName: targetUser?.name || 'Selected User',
      userEmail: targetUser?.emailOrPhone || '',
      userRole: targetUser?.role || 'Staff',
      tenantId: targetTenant?.id || targetTenant?.tenantId || 'tenant-default',
      tenantName: targetTenant?.name || targetUser?.storeName || 'Primary Store',
      dbNodeId: targetNode.id,
      dbNodeName: targetNode.name,
      accessPrivilege: selectedPrivilege,
      assignedAt: new Date().toISOString(),
      status: 'ACTIVE',
      notes: assignmentNotes.trim() || 'Assigned via Master Server Database Engine'
    };

    // Replace if user already assigned to same node, or append
    const existingFiltered = assignments.filter(a => !(a.userId === selectedUserId && a.dbNodeId === selectedDbNodeId));
    const updatedList = [newAssignment, ...existingFiltered];

    await saveAssignments(updatedList);
    setIsSaving(false);
    setShowAddModal(false);
    setSelectedUserId('');
    setAssignmentNotes('');

    const msg = `✅ User "${newAssignment.userName}" successfully assigned to ${targetNode.name}!`;
    if (onNotify) onNotify(msg);
  };

  // Handle Delete / Unassign User
  const handleDeleteAssignment = async (id: string, userName: string, nodeName: string) => {
    if (!confirm(`Are you sure you want to unassign user "${userName}" from ${nodeName}?`)) {
      return;
    }

    const updated = assignments.filter(a => a.id !== id);
    await saveAssignments(updated);

    // Call server delete endpoint
    try {
      await fetch(`/api/master/db-assignments/${id}`, { method: 'DELETE' });
    } catch (e) {}

    const msg = `User "${userName}" assignment removed successfully.`;
    if (onNotify) onNotify(msg);
  };

  // Filtered List
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (selectedNodeFilter !== 'ALL' && a.dbNodeId !== selectedNodeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUser = a.userName.toLowerCase().includes(q);
        const matchEmail = a.userEmail?.toLowerCase().includes(q);
        const matchTenant = a.tenantName.toLowerCase().includes(q);
        const matchNode = a.dbNodeName.toLowerCase().includes(q);
        if (!matchUser && !matchEmail && !matchTenant && !matchNode) return false;
      }
      return true;
    });
  }, [assignments, selectedNodeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white">Database Engine User &amp; Tenant Assignment</h2>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                ZERO LAG • INSTANT ASSIGN / DELETE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Assign staff cashiers, store managers, and tenants to dedicated MariaDB clusters, in-memory sync engines, or isolated data shards. Full real-time control to assign, modify permissions, or unassign users instantly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign User to Database</span>
          </button>

          <button
            onClick={loadAssignmentsData}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Database Nodes Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {DB_NODES.map((node) => {
          const userCount = assignments.filter(a => a.dbNodeId === node.id).length;
          return (
            <div key={node.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white space-y-2 shadow-sm transition">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{node.name.split('(')[0]}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
              </div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {userCount} User{userCount !== 1 ? 's' : ''}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{node.host}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px]">READY</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-900 dark:text-white shadow-sm">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, store, role, or database node..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedNodeFilter}
            onChange={(e) => setSelectedNodeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Database Nodes</option>
            {DB_NODES.map(n => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </div>

        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Showing {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Main Table of Assignments */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-slate-900 dark:text-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Assigned User</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Pharmacy / Tenant</th>
                <th className="py-3 px-3">Target Database Node</th>
                <th className="py-3 px-3">Privileges</th>
                <th className="py-3 px-3">Assigned Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {filteredAssignments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{a.userName}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{a.userEmail || a.userId}</div>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800/60">
                      {a.userRole}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                    {a.tenantName}
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      <span>{a.dbNodeName.split('(')[0]}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{a.dbNodeId}</span>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      a.accessPrivilege === 'FULL_ADMIN' 
                        ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                        : a.accessPrivilege === 'READ_WRITE'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}>
                      {a.accessPrivilege}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {new Date(a.assignedAt).toLocaleDateString()}
                  </td>

                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => handleDeleteAssignment(a.id, a.userName, a.dbNodeName)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/30 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                      title="Delete assignment and unassign user"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete / Unassign</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredAssignments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No database user assignments match the selected filter. Click "Assign User to Database" above to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ASSIGNMENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-white space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Assign User to Database Engine Node</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
              {/* Select User */}
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">
                  Select User Account <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose User Account --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      👤 {u.name} ({u.emailOrPhone || u.id}) — {u.role} [{u.storeName || 'Store'}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Database Node */}
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">
                  Select Target Database Engine Node <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedDbNodeId}
                  onChange={(e) => setSelectedDbNodeId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  {DB_NODES.map(n => (
                    <option key={n.id} value={n.id}>
                      🗄️ {n.name} [{n.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Privilege Level */}
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">
                  Database Access &amp; Permissions Mode
                </label>
                <select
                  value={selectedPrivilege}
                  onChange={(e) => setSelectedPrivilege(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="READ_WRITE">Full Read/Write (Standard POS &amp; Inventory)</option>
                  <option value="READ_ONLY">Read-Only (Reports &amp; Auditing)</option>
                  <option value="FULL_ADMIN">Full Administrator (DDL + Schema + DML)</option>
                  <option value="ISOLATED_SCHEMA">Isolated Encrypted Tenant Schema</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">
                  Assignment Remarks / Notes
                </label>
                <input
                  type="text"
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="e.g. Assigned to main billing register"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>Save Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
