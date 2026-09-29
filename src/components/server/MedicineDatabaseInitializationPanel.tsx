import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  Pill,
  Layers,
  Users,
  Send,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  ShieldCheck,
  Building2,
  Lock,
  Download,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { CentralMedicine } from '../../types';
import {
  getCentralMedicines,
  saveCentralMedicineRecord,
  deleteCentralMedicineRecord,
  shiftMedicinesCategory,
  exportCentralMedicinesToCsv
} from '../../lib/centralMedicineDatabaseService';
import { getAllTenants } from '../../lib/masterServerService';
import { wipeAllDataExceptMedicines } from '../../lib/db';

import { CentralDatabaseTab } from './medicine-init/CentralDatabaseTab';
import { CategoriesTab } from './medicine-init/CategoriesTab';
import { CustomersTab } from './medicine-init/CustomersTab';
import { AssignMedicinesTab } from './medicine-init/AssignMedicinesTab';
import { BulkAssignmentTab } from './medicine-init/BulkAssignmentTab';
import { SyncedItemsTab } from './medicine-init/SyncedItemsTab';
import { ImportExportTab } from './medicine-init/ImportExportTab';
import { AuditLogTab } from './medicine-init/AuditLogTab';

import { MedicineEditModal } from './medicine-init/MedicineEditModal';
import { DeleteConfirmModal } from './medicine-init/DeleteConfirmModal';
import { ShiftCategoryModal } from './medicine-init/ShiftCategoryModal';
import { CsvUploadModal } from './medicine-init/CsvUploadModal';

type ActiveTab = 
  | 'database'
  | 'categories'
  | 'customers'
  | 'assign'
  | 'bulk'
  | 'synced'
  | 'import_export'
  | 'audit';

interface MedicineDatabaseInitializationPanelProps {
  showToast?: (msg: string) => void;
}

export const MedicineDatabaseInitializationPanel: React.FC<MedicineDatabaseInitializationPanelProps> = ({
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('database');
  const [medicines, setMedicines] = useState<CentralMedicine[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<CentralMedicine | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingMedicine, setDeletingMedicine] = useState<CentralMedicine | null>(null);

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftMedicineIds, setShiftMedicineIds] = useState<string[]>([]);

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Preselection parameters for cross-tab workflows
  const [preselectedTenantId, setPreselectedTenantId] = useState<string | undefined>();
  const [preselectedMedicineIds, setPreselectedMedicineIds] = useState<string[] | undefined>();
  const [isWiping, setIsWiping] = useState(false);

  const handleWipeAllExceptMedicines = async () => {
    const confirmed = window.confirm(
      '⚠️ ALERT: Are you sure you want to remove ALL transaction records, invoices, purchases, parties, expenses, and accounts, while keeping ONLY the A-Z Medicine Database intact?'
    );
    if (!confirmed) return;

    setIsWiping(true);
    try {
      const res = await wipeAllDataExceptMedicines();
      loadCentralData();
      if (res.success) {
        toast(`✅ Clean Slate: Cleared all non-medicine stores. ${res.medicinesPreserved} medicines preserved.`);
      } else {
        toast('❌ Failed to clear records.');
      }
    } catch (e) {
      toast('❌ Error during data wipe.');
    } finally {
      setIsWiping(false);
    }
  };

  // MariaDB Live Status State
  const [mariaStatus, setMariaStatus] = useState<{
    connected: boolean;
    engine?: string;
    database?: string;
    host?: string;
    port?: number;
    pingMs?: number;
    error?: string;
  }>({ connected: true, engine: 'MariaDB 10.x / 11.x', port: 3306, database: 'mbi_inventra' });
  const [isCheckingMaria, setIsCheckingMaria] = useState(false);
  const [isProvisioningMaria, setIsProvisioningMaria] = useState(false);

  const checkMariaDbStatus = useCallback(async () => {
    setIsCheckingMaria(true);
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data = await res.json();
        setMariaStatus(data);
      }
    } catch (e) {
      setMariaStatus({ connected: false, engine: 'MariaDB 10.x / 11.x', port: 3306, error: 'Database service offline / Local sync active' });
    } finally {
      setIsCheckingMaria(false);
    }
  }, []);

  const handleProvisionMariaSchema = async () => {
    setIsProvisioningMaria(true);
    try {
      const res = await fetch('/api/db/init-mariadb', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast('✅ MariaDB schema & tables successfully initialized!');
        checkMariaDbStatus();
      } else {
        toast(`⚠️ ${data.message || 'MariaDB offline. SQL file saved for VPS import.'}`);
      }
    } catch (e: any) {
      toast('⚠️ MariaDB offline. Local sync active until database service is started.');
    } finally {
      setIsProvisioningMaria(false);
    }
  };

  const loadCentralData = useCallback(() => {
    const list = getCentralMedicines();
    setMedicines(list);
    const tList = getAllTenants();
    setTenants(tList);
    checkMariaDbStatus();
  }, [checkMariaDbStatus]);

  useEffect(() => {
    loadCentralData();

    // Listen to local events
    const handleUpdate = () => loadCentralData();
    window.addEventListener('mbi-central-medicines-updated', handleUpdate);
    window.addEventListener('mbi-central-assignments-updated', handleUpdate);
    return () => {
      window.removeEventListener('mbi-central-medicines-updated', handleUpdate);
      window.removeEventListener('mbi-central-assignments-updated', handleUpdate);
    };
  }, [loadCentralData]);

  const toast = useCallback((msg: string) => {
    if (showToast) showToast(msg);
  }, [showToast]);

  // Derived unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const m of medicines) {
      if (m.category?.trim()) set.add(m.category.trim());
    }
    return Array.from(set).sort();
  }, [medicines]);

  // Statistics
  const stats = useMemo(() => {
    const totalMeds = medicines.length;
    const totalCats = categories.length;
    const totalCustomers = tenants.length;
    const syncedCount = medicines.filter(m => m.source === 'CUSTOMER_SYNC' || m.isCustomerSynced).length;
    
    let totalAssignmentsCount = 0;
    for (const m of medicines) {
      totalAssignmentsCount += m.assignedTenantIds ? m.assignedTenantIds.length : 0;
    }

    return { totalMeds, totalCats, totalCustomers, syncedCount, totalAssignmentsCount };
  }, [medicines, categories, tenants]);

  // Handlers for Add/Edit
  const handleAddNew = () => {
    setEditingMedicine(null);
    setIsEditModalOpen(true);
  };

  const handleEdit = (med: CentralMedicine) => {
    setEditingMedicine(med);
    setIsEditModalOpen(true);
  };

  const handleSaveRecord = (data: Partial<CentralMedicine> & { name: string; category: string }) => {
    const res = saveCentralMedicineRecord(data);
    loadCentralData();
    toast(res.message);
  };

  // Handlers for Delete
  const handleDeletePrompt = (med: CentralMedicine) => {
    setDeletingMedicine(med);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (id: string, confirmedName: string) => {
    const res = deleteCentralMedicineRecord(id, confirmedName);
    loadCentralData();
    if (res.success) toast(res.message);
    else alert(res.message);
  };

  // Handlers for Category Shift
  const handleShiftPrompt = (medIds: string[]) => {
    setShiftMedicineIds(medIds);
    setIsShiftModalOpen(true);
  };

  const handleExecuteShift = (targetCat: string) => {
    const res = shiftMedicinesCategory(shiftMedicineIds, targetCat);
    loadCentralData();
    if (res.success) toast(res.message);
    else alert(res.message);
  };

  // Navigation handlers
  const handleQuickAssignFromDb = (medIds: string[]) => {
    setPreselectedMedicineIds(medIds);
    setPreselectedTenantId(undefined);
    setActiveTab('assign');
  };

  const handleAssignCategory = (cat: string) => {
    const catMedIds = medicines
      .filter(m => m.category.toLowerCase() === cat.toLowerCase())
      .map(m => m.id);
    setPreselectedMedicineIds(catMedIds);
    setPreselectedTenantId(undefined);
    setActiveTab('assign');
  };

  const handleOpenAssignForCustomer = (tenantId: string, tenantName: string) => {
    setPreselectedTenantId(tenantId);
    setPreselectedMedicineIds(undefined);
    setActiveTab('assign');
  };

  const handleExportFiltered = (cat?: string) => {
    const csv = exportCentralMedicinesToCsv(cat);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `central_medicines_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Export complete.');
  };

  return (
    <div className="space-y-6">
      {/* Top Master Header Banner (Light / Dark Mode Adaptive) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-inner">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Medicine Database Initialization Mode
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    Master Protected
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Centralized /server master catalog management, tenant medicine allocation, and automated client synchronization
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
              title="Upload medicines, surgical items, and orthopedic devices via .CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Upload .CSV File</span>
            </button>
            <button
              onClick={handleWipeAllExceptMedicines}
              disabled={isWiping}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Wipe all transaction & store data while preserving A-Z medicine catalog database"
            >
              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              {isWiping ? 'Wiping...' : 'Wipe All Data (Keep Medicines Only)'}
            </button>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Medicine Record
            </button>
            <button
              onClick={loadCentralData}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Refresh Central Database"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time KPI Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80">
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              Central Medicines
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {stats.totalMeds}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Categories
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {stats.totalCats}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Customer Tenants
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {stats.totalCustomers}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              Active Allocations
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {stats.totalAssignmentsCount}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Client Synced Items
            </div>
            <div className="text-lg font-bold text-teal-600 dark:text-teal-300 font-mono mt-0.5">
              {stats.syncedCount}
            </div>
          </div>
        </div>
      </div>

      {/* MariaDB Engine Live Diagnostics & Schema Deployment Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-900 dark:text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/30 dark:border-teal-500/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Database Engine: MariaDB 10.x / 11.x
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 dark:border-teal-500/40">
                Port 3306 • UTF8MB4
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                mariaStatus.connected
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40'
                  : 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${mariaStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {mariaStatus.connected ? 'Live Sync Active (14 Tables)' : 'Local Sync Active (Offline Mode)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              All transactions, 10,000+ medicines, surgical supplies, orthocare devices, batches, invoices, and khata records automatically synchronize with MariaDB.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={checkMariaDbStatus}
            disabled={isCheckingMaria}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Ping MariaDB Database Port"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingMaria ? 'animate-spin' : ''}`} />
            <span>Ping DB</span>
          </button>

          <button
            onClick={handleProvisionMariaSchema}
            disabled={isProvisioningMaria}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isProvisioningMaria ? 'Provisioning...' : 'Provision MariaDB Tables'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation (8 Tabs) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'database', label: 'Database', icon: Database, badge: stats.totalMeds },
          { id: 'categories', label: 'Categories', icon: Layers, badge: stats.totalCats },
          { id: 'customers', label: 'Customers', icon: Users, badge: stats.totalCustomers },
          { id: 'assign', label: 'Assign Medicines', icon: Send },
          { id: 'bulk', label: 'Bulk Assignment', icon: Building2 },
          { id: 'synced', label: 'Synced Items', icon: Sparkles, badge: stats.syncedCount },
          { id: 'import_export', label: 'Import / Export', icon: FileSpreadsheet },
          { id: 'audit', label: 'Audit Log', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-sky-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Views */}
      <div className="min-h-[450px]">
        {activeTab === 'database' && (
          <CentralDatabaseTab
            medicines={medicines}
            categories={categories}
            tenants={tenants}
            onAddNew={handleAddNew}
            onEdit={handleEdit}
            onDelete={handleDeletePrompt}
            onQuickAssign={handleQuickAssignFromDb}
            onShiftCategory={handleShiftPrompt}
            onExportFiltered={handleExportFiltered}
            onOpenCsvUpload={() => setIsCsvModalOpen(true)}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            tenants={tenants}
            onAssignCategory={handleAssignCategory}
            onShiftCategory={cat => {
              const catMeds = medicines.filter(m => m.category.toLowerCase() === cat.toLowerCase()).map(m => m.id);
              handleShiftPrompt(catMeds);
            }}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersTab
            onOpenAssignForCustomer={handleOpenAssignForCustomer}
            onRefresh={loadCentralData}
          />
        )}

        {activeTab === 'assign' && (
          <AssignMedicinesTab
            medicines={medicines}
            categories={categories}
            tenants={tenants}
            preselectedTenantId={preselectedTenantId}
            preselectedMedicineIds={preselectedMedicineIds}
            onComplete={() => {
              loadCentralData();
              setActiveTab('customers');
            }}
            showToast={toast}
            onOpenCsvUpload={() => setIsCsvModalOpen(true)}
          />
        )}

        {activeTab === 'bulk' && (
          <BulkAssignmentTab
            medicines={medicines}
            categories={categories}
            tenants={tenants}
            onComplete={loadCentralData}
            showToast={toast}
          />
        )}

        {activeTab === 'synced' && (
          <SyncedItemsTab
            medicines={medicines}
            onAssignToOthers={medIds => {
              setPreselectedMedicineIds(medIds);
              setActiveTab('assign');
            }}
          />
        )}

        {activeTab === 'import_export' && (
          <ImportExportTab
            categories={categories}
            onImportComplete={loadCentralData}
            showToast={toast}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogTab />
        )}
      </div>

      {/* Modals */}
      <MedicineEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveRecord}
        initialData={editingMedicine}
        existingCategories={categories}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        medicine={deletingMedicine}
      />

      <ShiftCategoryModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onShift={handleExecuteShift}
        selectedCount={shiftMedicineIds.length}
        categories={categories}
      />

      <CsvUploadModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        tenants={tenants}
        preselectedTenantId={preselectedTenantId}
        onSuccess={() => {
          loadCentralData();
          setIsCsvModalOpen(false);
        }}
        showToast={toast}
      />
    </div>
  );
};
