import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign, TrendingUp, Users, Clock, AlertCircle, CheckCircle2,
  Share2, ArrowUpRight, Search, Plus, RefreshCw, Calendar, 
  CreditCard, ShieldCheck, FileText, Phone, Building2, ExternalLink,
  Award, PackageCheck, Calculator, Sparkles, Layers, Trophy,
  Percent, ArrowRight, Zap, BadgePercent, Check, Lock, Unlock,
  Sliders, Key, Smartphone, HardDrive, ShieldAlert, CheckSquare,
  Square, ChevronRight, Eye, UserCheck, Shield, HelpCircle, AlertTriangle
} from 'lucide-react';
import { 
  getSoftwareSalesMetrics, 
  SoftwareSalesMetrics, 
  ClientLicense, 
  getAllClientLicenses, 
  getAllTenants,
  saveTenant,
  saveClientLicense,
  resetLicenseHardware,
  logMasterAudit,
  Tenant
} from '../../lib/masterServerService';
import { LicenseActivationModal } from './LicenseActivationModal';

interface SoftwareSalesRevenueDashboardProps {
  onOpenNewLicense?: () => void;
  onOpenNewTenant?: () => void;
  onNotify?: (msg: string) => void;
}

// Ultra-Advance Feature Definitions for Per-Company Granular Overrides
interface FeatureDefinition {
  key: string;
  name: string;
  category: 'Inventory & Expiry' | 'Pricing & Margins' | 'Compliance & Tax' | 'AI & Automation' | 'Omnichannel & Security';
  description: string;
  badge: string;
  color: string;
  defaultInPlan: 'Basic' | 'Business' | 'Enterprise';
}

const ULTRA_ADVANCE_FEATURES: FeatureDefinition[] = [
  // 1. Inventory & Expiry
  {
    key: 'fefo_expiry_management',
    name: 'FEFO & Near-Expiry AI Management',
    category: 'Inventory & Expiry',
    description: 'Enforces First-Expiry-First-Out picking logic and automated 30/60/90-day expiry loss prevention alerts.',
    badge: 'FEFO',
    color: 'emerald',
    defaultInPlan: 'Business'
  },
  {
    key: 'godowns',
    name: 'Multi-Godowns & Warehouse Hubs',
    category: 'Inventory & Expiry',
    description: 'Unlimited warehouse locations, branch stock transfers, and godown-wise inventory segregation.',
    badge: 'Godowns',
    color: 'indigo',
    defaultInPlan: 'Business'
  },
  {
    key: 'batch_management',
    name: 'Batch & Serial Number Tracking',
    category: 'Inventory & Expiry',
    description: 'Comprehensive batch number, manufacturing dates, and supplier lot tracking per transaction.',
    badge: 'Batches',
    color: 'blue',
    defaultInPlan: 'Business'
  },
  {
    key: 'shortage_registry',
    name: 'Shortage Registry & Lost Demand Analytics',
    category: 'Inventory & Expiry',
    description: 'Tracks customer demand for out-of-stock medicines to generate automated supplier purchase orders.',
    badge: 'Shortage',
    color: 'amber',
    defaultInPlan: 'Business'
  },
  {
    key: 'narcotics_register',
    name: 'Controlled Drugs & Narcotics Register (DRAP)',
    category: 'Inventory & Expiry',
    description: 'Strict DRAP Form-8 regulatory recording, physician registration tracking, and narcotics batch logs.',
    badge: 'DRAP Rx',
    color: 'rose',
    defaultInPlan: 'Enterprise'
  },

  // 2. Pricing & Margins
  {
    key: 'live_profit_margin',
    name: 'Live Profit Margin on Sales & Invoicing',
    category: 'Pricing & Margins',
    description: 'Displays real-time gross profit percentage and margin calculations directly on the active cashier POS screen.',
    badge: 'Live Profit',
    color: 'emerald',
    defaultInPlan: 'Business'
  },
  {
    key: 'multiple_pricing_levels',
    name: 'Multi-Tier Wholesale & Retail Pricing',
    category: 'Pricing & Margins',
    description: 'Supports customer-specific rates, wholesale tier pricing, distributor slabs, and bulk quantity discounts.',
    badge: 'Tier Rates',
    color: 'teal',
    defaultInPlan: 'Business'
  },
  {
    key: 'custom_item_fields',
    name: 'Custom Product & Invoice Metadata Fields',
    category: 'Pricing & Margins',
    description: 'Add dynamic custom parameters (dosage strength, rack shelf, imported flag, warranty periods).',
    badge: 'Custom Fields',
    color: 'purple',
    defaultInPlan: 'Business'
  },
  {
    key: 'category_profit_heatmap',
    name: 'Category-Wise Profit & Loss Heatmap',
    category: 'Pricing & Margins',
    description: 'Visual financial analytics breaking down profit margins across medicine and surgical classifications.',
    badge: 'Heatmaps',
    color: 'indigo',
    defaultInPlan: 'Business'
  },

  // 3. Compliance & Tax
  {
    key: 'fbr_pos_integration',
    name: 'FBR Digital Invoicing & Tax QR Stamps',
    category: 'Compliance & Tax',
    description: 'Real-time integration with Federal Board of Revenue POS Tier-1 server with automated fiscal invoice numbers.',
    badge: 'FBR Tier-1',
    color: 'rose',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'journal_vouchers',
    name: 'Chart of Accounts & Double-Entry Journal Vouchers',
    category: 'Compliance & Tax',
    description: 'Full accounting module with General Ledger, Balance Sheet, P&L, Trial Balance, and Journal entries.',
    badge: 'GL & JV',
    color: 'sky',
    defaultInPlan: 'Enterprise'
  },

  // 4. AI & Automation
  {
    key: 'ai_assistant',
    name: 'AI Smart Pharmacy & Clinical Drug Assistant',
    category: 'AI & Automation',
    description: 'Intelligent drug interaction alerts, dosage recommendations, generic alternative substitutions, and supplier insights.',
    badge: 'AI Smart',
    color: 'purple',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'whatsapp_automation',
    name: 'Automated WhatsApp PDF Invoicing & Reminders',
    category: 'AI & Automation',
    description: '1-click direct PDF invoice dispatch, automated payment due reminders, and bulk customer khata alerts via WhatsApp.',
    badge: 'WhatsApp',
    color: 'emerald',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'demand_forecast',
    name: 'Automated Purchase Reordering & Forecast',
    category: 'AI & Automation',
    description: 'Predicts inventory reorder quantities based on historical sales velocity and seasonal demand trends.',
    badge: 'Forecasting',
    color: 'blue',
    defaultInPlan: 'Business'
  },

  // 5. Omnichannel & Security
  {
    key: 'online_storefront',
    name: 'Digital Online Pharmacy Storefront & App',
    category: 'Omnichannel & Security',
    description: 'Customer-facing e-commerce storefront with live stock availability, online prescriptions, and order tracking.',
    badge: 'Web Store',
    color: 'indigo',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'booker_biller_management',
    name: 'Order Bookers & Field Sales Fleet Module',
    category: 'Omnichannel & Security',
    description: 'Field staff mobile order collection, route planning, order booking commission management, and cash collection ledger.',
    badge: 'Bookers',
    color: 'cyan',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'full_audit_trail',
    name: 'Enterprise Audit Trail & Staff Action Logs',
    category: 'Omnichannel & Security',
    description: 'Forensic tamper-proof logging of price modifications, invoice voids, discounts, deletions, and user sessions.',
    badge: 'Audit Trail',
    color: 'rose',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'recycle_bin_extended',
    name: '30-Day / Lifetime Recycle Bin Recovery',
    category: 'Omnichannel & Security',
    description: 'Recover accidentally deleted sales, purchases, customers, and inventory items with 1-click rollback.',
    badge: 'Recovery',
    color: 'teal',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'lan_multi_terminal_sync',
    name: 'Multi-Terminal LAN Offline Peer Sync',
    category: 'Omnichannel & Security',
    description: 'Sub-second real-time counter synchronization across multiple checkout terminals on the local network.',
    badge: 'LAN Sync',
    color: 'sky',
    defaultInPlan: 'Enterprise'
  }
];

export const SoftwareSalesRevenueDashboard: React.FC<SoftwareSalesRevenueDashboardProps> = ({
  onOpenNewLicense,
  onOpenNewTenant,
  onNotify
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'feature_matrix'>('overview');

  // Core Data states
  const [metrics, setMetrics] = useState<SoftwareSalesMetrics>(() => getSoftwareSalesMetrics());
  const [tenants, setTenants] = useState<Tenant[]>(() => getAllTenants());
  const [licenses, setLicenses] = useState<ClientLicense[]>(() => getAllClientLicenses());

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<string>('all');
  const [selectedTenantForFeatures, setSelectedTenantForFeatures] = useState<string>('all');

  // Modals & Sub-states
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [isEditPricingModalOpen, setIsEditPricingModalOpen] = useState(false);
  const [selectedTenantForPricing, setSelectedTenantForPricing] = useState<Tenant | null>(null);
  const [editPriceForm, setEditPriceForm] = useState({
    salePrice: 0,
    amountPaid: 0,
    amountDue: 0,
    saleStatus: 'Paid' as 'Paid' | 'Partial' | 'Pending' | 'Complimentary / Trial',
    paymentMethod: 'Bank Transfer' as 'Cash' | 'Bank Transfer' | 'EasyPaisa / JazzCash' | 'Cheque' | 'Other',
    notes: ''
  });

  const toast = useCallback((msg: string) => {
    if (onNotify) onNotify(msg);
  }, [onNotify]);

  const refreshAllData = useCallback(() => {
    const updatedMetrics = getSoftwareSalesMetrics();
    const updatedTenants = getAllTenants();
    const updatedLicenses = getAllClientLicenses();

    setMetrics(updatedMetrics);
    setTenants(updatedTenants);
    setLicenses(updatedLicenses);
  }, []);

  useEffect(() => {
    refreshAllData();

    const handleTenantsUpdate = () => refreshAllData();
    const handleLicensesUpdate = () => refreshAllData();

    window.addEventListener('mbi-tenants-updated', handleTenantsUpdate);
    window.addEventListener('mbi-licenses-updated', handleLicensesUpdate);

    return () => {
      window.removeEventListener('mbi-tenants-updated', handleTenantsUpdate);
      window.removeEventListener('mbi-licenses-updated', handleLicensesUpdate);
    };
  }, [refreshAllData]);

  const formatPkr = (num: number) => {
    return 'Rs. ' + (num || 0).toLocaleString('en-PK');
  };

  // =========================================================================
  // ACTIONS: 1-CLICK EXTEND, LOCK / UNLOCK, UPGRADE PLAN & HARDWARE RESET
  // =========================================================================

  const handleExtendExpiry = (tenantId: string, daysToAdd: number | 'lifetime') => {
    const target = tenants.find(t => t.id === tenantId || t.tenantId === tenantId);
    if (!target) return;

    let newExpiryStr = 'Lifetime';
    if (daysToAdd !== 'lifetime') {
      const currentExpiryMs = target.trialExpiryDate && target.trialExpiryDate !== 'Lifetime' 
        ? new Date(target.trialExpiryDate).getTime() 
        : Date.now();
      const baseMs = Math.max(Date.now(), currentExpiryMs);
      const newExpiryDate = new Date(baseMs + daysToAdd * 24 * 60 * 60 * 1000);
      newExpiryStr = newExpiryDate.toISOString();
    }

    target.trialExpiryDate = newExpiryStr;
    target.status = 'Active';
    target.isTrialActive = daysToAdd !== 'lifetime' && target.status === 'Trial';
    target.trialExpired = false;
    target.paidLicenseActive = daysToAdd === 'lifetime' || target.paidLicenseActive;
    target.updatedAt = new Date().toISOString();

    saveTenant(target);

    // Sync license record
    const linkedLicense = licenses.find(l => l.licenseKey === target.licenseId || l.clientName.toLowerCase() === target.name.toLowerCase());
    if (linkedLicense) {
      linkedLicense.expiryDate = newExpiryStr;
      linkedLicense.status = 'Active';
      saveClientLicense(linkedLicense);
    }

    refreshAllData();
    toast(`✅ License extended for ${target.name} (${daysToAdd === 'lifetime' ? 'Lifetime Perpetual' : `+${daysToAdd} Days`}). Sub-users auto-synced!`);
  };

  const handleToggleLock = (tenantId: string, currentStatus: string) => {
    const target = tenants.find(t => t.id === tenantId || t.tenantId === tenantId);
    if (!target) return;

    const isCurrentlyLocked = currentStatus === 'Suspended';
    const newStatus: Tenant['status'] = isCurrentlyLocked ? 'Active' : 'Suspended';

    target.status = newStatus;
    target.updatedAt = new Date().toISOString();
    saveTenant(target);

    // Update linked license
    const linkedLicense = licenses.find(l => l.licenseKey === target.licenseId || l.clientName.toLowerCase() === target.name.toLowerCase());
    if (linkedLicense) {
      linkedLicense.status = newStatus === 'Suspended' ? 'Suspended' : 'Active';
      saveClientLicense(linkedLicense);
    }

    logMasterAudit(
      newStatus === 'Suspended' ? 'Tenant Locked' : 'Tenant Unlocked',
      'SECURITY',
      `Company ${target.name} was ${newStatus === 'Suspended' ? 'LOCKED / SUSPENDED' : 'UNLOCKED'} by Master Admin. All sub-users ${newStatus === 'Suspended' ? 'locked out' : 'restored'}.`,
      target.name
    );

    refreshAllData();
    toast(
      newStatus === 'Suspended'
        ? `🔒 ${target.name} has been LOCKED. All sub-users are immediately blocked from transactions.`
        : `🔓 ${target.name} has been UNLOCKED. Access restored for all sub-users.`
    );
  };

  const handleUpgradePlan = (tenantId: string, newPlan: Tenant['plan']) => {
    const target = tenants.find(t => t.id === tenantId || t.tenantId === tenantId);
    if (!target) return;

    const oldPlan = target.plan;
    target.plan = newPlan;
    target.paidLicenseActive = true;
    target.status = 'Active';
    target.isTrialActive = false;
    target.trialExpired = false;
    target.updatedAt = new Date().toISOString();

    saveTenant(target);

    // Update linked license
    const linkedLicense = licenses.find(l => l.licenseKey === target.licenseId || l.clientName.toLowerCase() === target.name.toLowerCase());
    if (linkedLicense) {
      linkedLicense.plan = newPlan as any;
      linkedLicense.status = 'Active';
      saveClientLicense(linkedLicense);
    }

    logMasterAudit(
      'Plan Upgraded',
      'LICENSE',
      `Upgraded ${target.name} from ${oldPlan} to ${newPlan}. All sub-users inherit ${newPlan} permissions immediately.`,
      target.name
    );

    refreshAllData();
    toast(`💎 ${target.name} upgraded to ${newPlan}! All sub-users immediately inherit tier benefits.`);
  };

  const handleResetMachineBinding = (licenseKeyOrId: string, tenantName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to reset hardware machine fingerprints for ${tenantName}? This will allow the client to bind a new PC/Laptop.`
    );
    if (!confirmed) return;

    resetLicenseHardware(licenseKeyOrId);
    refreshAllData();
    toast(`🔄 Hardware machine binding cleared for ${tenantName}. Client can now activate on a new device.`);
  };

  // =========================================================================
  // GRANULAR PER-COMPANY ULTRA-ADVANCE FEATURE TOGGLE (SUB-USER AUTO-INHERITANCE)
  // =========================================================================

  const handleToggleCompanyFeature = (tenantId: string, featureKey: string, currentVal: boolean) => {
    const target = tenants.find(t => t.id === tenantId || t.tenantId === tenantId);
    if (!target) return;

    const newVal = !currentVal;
    
    // 1. Update in-memory tenant object
    const existingFeatures = (target as any).features || (target as any).customFeatures || {};
    const updatedFeatures = {
      ...existingFeatures,
      [featureKey]: newVal
    };

    (target as any).features = updatedFeatures;
    (target as any).customFeatures = updatedFeatures;

    // Map to legacy featureToggles if key matches
    if (target.featureToggles && featureKey in target.featureToggles) {
      (target.featureToggles as any)[featureKey] = newVal;
    }

    target.updatedAt = new Date().toISOString();
    saveTenant(target);

    // 2. Save explicitly to dedicated localStorage tenant override key
    try {
      localStorage.setItem(`mbi_tenant_features_${target.tenantId || target.id}`, JSON.stringify(updatedFeatures));
    } catch (e) {}

    // 3. Broadcast real-time cross-tab event for sub-users
    window.dispatchEvent(
      new CustomEvent('mbi-tenant-features-updated', {
        detail: { tenantId: target.tenantId || target.id, features: updatedFeatures }
      })
    );

    logMasterAudit(
      'Feature Override Toggled',
      'SECURITY',
      `Master Admin ${newVal ? 'ENABLED' : 'DISABLED'} feature [${featureKey}] for company ${target.name}. (Auto-synced to all sub-users)`,
      target.name
    );

    refreshAllData();
    toast(
      `⚡ [${featureKey}] ${newVal ? 'ENABLED (Unlocked)' : 'DISABLED (Revoked)'} for ${target.name} and ALL sub-users!`
    );
  };

  // Check if a feature is enabled for a given tenant
  const isFeatureEnabledForTenant = (tenant: Tenant, featureKey: string): boolean => {
    // 1. Direct tenant override
    const custom = (tenant as any).features || (tenant as any).customFeatures;
    if (custom && typeof custom === 'object' && featureKey in custom) {
      return Boolean(custom[featureKey]);
    }

    // 2. Check dedicated localStorage override
    try {
      const stored = localStorage.getItem(`mbi_tenant_features_${tenant.tenantId || tenant.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (featureKey in parsed) return Boolean(parsed[featureKey]);
      }
    } catch (e) {}

    // 3. Default plan inheritance
    const planName = (tenant.plan || 'Basic').toLowerCase();
    if (planName.includes('enterprise') || planName.includes('platinum') || planName.includes('lifetime')) {
      return true;
    }
    if (planName.includes('business') || planName.includes('gold') || planName.includes('pro')) {
      const feat = ULTRA_ADVANCE_FEATURES.find(f => f.key === featureKey);
      return feat?.defaultInPlan === 'Basic' || feat?.defaultInPlan === 'Business';
    }

    const feat = ULTRA_ADVANCE_FEATURES.find(f => f.key === featureKey);
    return feat?.defaultInPlan === 'Basic';
  };

  // Open Edit Pricing Modal
  const handleOpenEditPricing = (tenant: Tenant) => {
    setSelectedTenantForPricing(tenant);
    setEditPriceForm({
      salePrice: tenant.salePrice || 0,
      amountPaid: tenant.amountPaid || 0,
      amountDue: tenant.amountDue || 0,
      saleStatus: (tenant.saleStatus as any) || 'Paid',
      paymentMethod: (tenant.paymentMethod as any) || 'Bank Transfer',
      notes: tenant.saleNotes || ''
    });
    setIsEditPricingModalOpen(true);
  };

  const handleSaveDealPricing = () => {
    if (!selectedTenantForPricing) return;

    const target = tenants.find(t => (t.id === selectedTenantForPricing.id || t.tenantId === selectedTenantForPricing.tenantId));
    if (!target) return;

    target.salePrice = Number(editPriceForm.salePrice) || 0;
    target.amountPaid = Number(editPriceForm.amountPaid) || 0;
    target.amountDue = Math.max(0, target.salePrice - target.amountPaid);
    target.saleStatus = editPriceForm.saleStatus;
    target.paymentMethod = editPriceForm.paymentMethod;
    target.saleNotes = editPriceForm.notes;
    target.updatedAt = new Date().toISOString();

    saveTenant(target);

    // Sync to license
    const linkedLicense = licenses.find(l => l.licenseKey === target.licenseId || l.clientName.toLowerCase() === target.name.toLowerCase());
    if (linkedLicense) {
      linkedLicense.salePrice = target.salePrice;
      linkedLicense.amountPaid = target.amountPaid;
      linkedLicense.amountDue = target.amountDue;
      linkedLicense.saleStatus = target.saleStatus;
      linkedLicense.paymentMethod = target.paymentMethod;
      saveClientLicense(linkedLicense);
    }

    setIsEditPricingModalOpen(false);
    refreshAllData();
    toast(`💰 Deal pricing and sales ledger updated for ${target.name}!`);
  };

  const handleShareWhatsAppDeal = (deal: SoftwareSalesMetrics['recentDeals'][0]) => {
    const text = `*MBI INVENTRA POS & ERP - LICENSE & DEAL CONFIRMATION* 🚀%0A` +
      `---------------------------------------%0A` +
      `*Client Business:* ${deal.clientName}%0A` +
      `*Owner Name:* ${deal.ownerName}%0A` +
      `*City:* ${deal.city}%0A` +
      `*Software Plan:* ${deal.plan}%0A` +
      `*License Key:* ${deal.licenseKey}%0A` +
      `*Agreed Deal Price:* ${formatPkr(deal.salePrice)}%0A` +
      `*Amount Paid:* ${formatPkr(deal.amountPaid)}%0A` +
      `*Balance Due:* ${formatPkr(deal.amountDue)}%0A` +
      `*Payment Status:* ${deal.saleStatus.toUpperCase()}%0A` +
      `*Payment Method:* ${deal.paymentMethod}%0A` +
      `*Date of Issue:* ${deal.saleDate}%0A` +
      `---------------------------------------%0A` +
      `Thank you for choosing MBI Inventra POS & ERP. For 24/7 Priority Master Support: 03364585863.`;

    const cleanPhone = (deal.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('92') ? cleanPhone : 
                             cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    const url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${text}`;
    window.open(url, '_blank');
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return metrics.recentDeals.filter(d => {
      const matchSearch = 
        d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.licenseKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.plan.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (statusFilter !== 'all' && d.saleStatus !== statusFilter) return false;
      if (planFilter !== 'all' && d.plan !== planFilter) return false;

      return true;
    });
  }, [metrics.recentDeals, searchTerm, statusFilter, planFilter]);

  // Filtered Tenants (Companies)
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        (t.name || '').toLowerCase().includes(q) ||
        (t.ownerName || '').toLowerCase().includes(q) ||
        (t.ownerPhone || '').toLowerCase().includes(q) ||
        (t.city || '').toLowerCase().includes(q) ||
        (t.licenseId || '').toLowerCase().includes(q) ||
        (t.tenantId || '').toLowerCase().includes(q) ||
        (t.plan || '').toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (planFilter !== 'all' && t.plan !== planFilter) return false;

      return true;
    });
  }, [tenants, searchTerm, statusFilter, planFilter]);

  // Filtered Features
  const filteredFeatures = useMemo(() => {
    return ULTRA_ADVANCE_FEATURES.filter(f => {
      if (featureCategoryFilter !== 'all' && f.category !== featureCategoryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.badge.toLowerCase().includes(q);
      }
      return true;
    });
  }, [featureCategoryFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Master Hub Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm dark:shadow-xl transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Software Sales & Master Revenue Hub</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/50">
                  Master Multi-Tenant Engine
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40">
                  Sub-User Auto-Sync Live
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full-proof license governance, custom pricing, granular feature switchboard, and instant sub-user inheritance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={refreshAllData}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Fleet</span>
          </button>

          <button
            onClick={() => {
              if (onOpenNewLicense) onOpenNewLicense();
              else setIsActivationModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Sale Deal</span>
          </button>

          {onOpenNewTenant && (
            <button
              onClick={onOpenNewTenant}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30 active:scale-95"
            >
              <Building2 className="w-4 h-4" />
              <span>Onboard Tenant Store</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Overview & Sales Revenue', icon: DollarSign, badge: `${metrics.totalDealsCount} Deals` },
          { id: 'companies', label: 'Company Licenses & Fleet Governance', icon: Building2, badge: `${tenants.length} Companies` },
          { id: 'feature_matrix', label: 'Ultra-Advance Feature Matrix & Overrides', icon: Zap, badge: '18 Modules' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isActive ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
              }`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-User Auto-Inheritance Guarantee Banner */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong className="font-black text-slate-900 dark:text-white">Multi-Tenant Hard Isolation Guarantee:</strong> Any plan upgrade, expiry extension, lock action, or custom feature enabled for a company automatically propagates to all cashiers, billers, and staff of that company in real-time. Data remains 100% logically isolated per <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">tenant_id</code>.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE SALES & REVENUE OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 3 Executive Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Top Performing Products */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 rounded-3xl shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-amber-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Performance Leader</span>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">Top Performing Products</h3>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                    #1 Best Seller
                  </span>
                </div>

                <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span>{metrics.topPerformingProduct.planName}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="text-amber-700 dark:text-amber-300 font-bold font-mono">{metrics.topPerformingProduct.dealsCount} Units Sold</span> &bull; <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">{metrics.topPerformingProduct.percentage}% Share</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatPkr(metrics.topPerformingProduct.revenuePkr)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Revenue Generated</div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(12, metrics.topPerformingProduct.percentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>Gross Portfolio Value:</span>
                <span className="text-amber-700 dark:text-amber-300 font-mono font-bold">{formatPkr(metrics.totalRevenuePkr)}</span>
              </div>
            </div>

            {/* Card 2: Total Units Sold */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-3xl shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-indigo-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
                      <PackageCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">Fleet Volume</span>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">Total Units Sold</h3>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40">
                    Commercial Units
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-3">
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {metrics.totalUnitsSold}
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
                    Licenses &amp; Systems Deployed
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Paid &amp; Partial</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {metrics.paidDealsCount + metrics.partialDealsCount} Units
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Active Trials</span>
                    <span className="text-sm font-black text-cyan-600 dark:text-cyan-300 font-mono">
                      {metrics.trialDealsCount} Units
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>Active Commercial Stores:</span>
                <span className="text-indigo-600 dark:text-indigo-300 font-mono font-bold">{metrics.activePaidTenantsCount} Stores</span>
              </div>
            </div>

            {/* Card 3: Average Transaction Value (ATV) */}
            <div className="p-5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 rounded-3xl shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-emerald-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Deal Economics</span>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">Average Transaction Value</h3>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                    ATV (PKR)
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                    {formatPkr(metrics.averageTransactionValuePkr)}
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ deal</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Cash Realized</span>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-300 font-mono">
                      {formatPkr(metrics.totalCollectedPkr)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Pending Due</span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                      {formatPkr(metrics.totalReceivablePkr)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>Realization Efficiency:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  {metrics.totalRevenuePkr > 0 ? Math.round((metrics.totalCollectedPkr / metrics.totalRevenuePkr) * 100) : 100}%
                </span>
              </div>
            </div>
          </div>

          {/* 6 Quick Sales Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Sales Booked</span>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">{formatPkr(metrics.totalRevenuePkr)}</div>
              <div className="text-[10px] text-emerald-600 font-bold mt-0.5">{metrics.totalDealsCount} Closed Deals</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-500/30 rounded-2xl">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Cash Collected</span>
              <div className="text-lg font-black text-blue-600 dark:text-blue-300 mt-1">{formatPkr(metrics.totalCollectedPkr)}</div>
              <div className="text-[10px] text-slate-500 font-bold mt-0.5">{metrics.paidDealsCount} Paid in Full</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 rounded-2xl">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Receivables Due</span>
              <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">{formatPkr(metrics.totalReceivablePkr)}</div>
              <div className="text-[10px] text-amber-600 font-bold mt-0.5">{metrics.pendingDealsCount} Unpaid Clients</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/30 rounded-2xl">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Commercial Fleet</span>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">{metrics.activePaidTenantsCount} Stores</div>
              <div className="text-[10px] text-purple-600 font-bold mt-0.5">Active Paid Licenses</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 rounded-2xl">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Renewals Due</span>
              <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">{metrics.renewalsDueThisMonth} Stores</div>
              <div className="text-[10px] text-rose-600 font-bold mt-0.5">Expiring in 30 Days</div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-500/30 rounded-2xl">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Trial Leads</span>
              <div className="text-lg font-black text-cyan-600 dark:text-cyan-300 mt-1">{metrics.trialDealsCount} Trials</div>
              <div className="text-[10px] text-cyan-600 font-bold mt-0.5">Pipeline Funnel</div>
            </div>
          </div>

          {/* Deals Feed Table */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Software Sales Ledger &amp; Live Deals Feed</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">All registered custom pricing deals, payments, and WhatsApp confirmation receipts</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search company, owner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Status</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Pending">Pending</option>
                  <option value="Complimentary / Trial">Trial / Free</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-3.5">Company / Store</th>
                    <th className="py-3 px-3.5">Plan &amp; License Key</th>
                    <th className="py-3 px-3.5 text-right">Deal Price</th>
                    <th className="py-3 px-3.5 text-right">Paid / Due</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredDeals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No sales deals found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-black text-slate-900 dark:text-white">{deal.clientName}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{deal.ownerName}</span>
                            <span>•</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">{deal.phone}</span>
                            <span>•</span>
                            <span className="text-slate-400">{deal.city}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{deal.plan}</span>
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">{deal.licenseKey}</span>
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                            {formatPkr(deal.salePrice)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{deal.saleDate}</div>
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <div className="text-xs font-bold text-blue-600 dark:text-blue-300 font-mono">
                            Paid: {formatPkr(deal.amountPaid)}
                          </div>
                          {deal.amountDue > 0 && (
                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                              Due: {formatPkr(deal.amountDue)}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            deal.saleStatus === 'Paid' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/50' :
                            deal.saleStatus === 'Partial' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-600/50' :
                            deal.saleStatus === 'Pending' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-600/50 animate-pulse' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {deal.saleStatus}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleShareWhatsAppDeal(deal)}
                              className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Share Official Deal Receipt on WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>WhatsApp</span>
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

      {/* ========================================================================= */}
      {/* TAB 2: COMPANY LICENSES & FLEET GOVERNANCE (EXTEND, LOCK, UPGRADE) */}
      {/* ========================================================================= */}
      {activeTab === 'companies' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by company name, owner, city, license ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All Company Status</option>
                <option value="Active">Active</option>
                <option value="Suspended">Locked / Suspended</option>
                <option value="Trial">Trial Active</option>
                <option value="Expired">Expired</option>
              </select>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">All Plans</option>
                <option value="Basic">Basic Silver</option>
                <option value="Business">Business Gold</option>
                <option value="Enterprise Multi-Branch">Enterprise Platinum</option>
                <option value="Lifetime Perpetual">Lifetime Perpetual</option>
              </select>
            </div>
          </div>

          {/* Companies Control Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredTenants.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-xs">
                No company records found matching filters.
              </div>
            ) : (
              filteredTenants.map((tenant) => {
                const isLocked = tenant.status === 'Suspended';
                const isLifetime = tenant.trialExpiryDate === 'Lifetime' || (tenant.plan && tenant.plan.includes('Lifetime'));
                const linkedLic = licenses.find(l => l.licenseKey === tenant.licenseId || l.clientName.toLowerCase() === tenant.name.toLowerCase());

                return (
                  <div 
                    key={tenant.id || tenant.tenantId} 
                    className={`p-5 bg-white dark:bg-slate-900 border rounded-3xl shadow-sm transition-all ${
                      isLocked 
                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Left Company Identity */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="text-base font-black text-slate-900 dark:text-white">
                            {tenant.name}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isLocked 
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                              : tenant.status === 'Active'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          }`}>
                            {isLocked ? 'LOCKED (SUB-USERS SUSPENDED)' : tenant.status.toUpperCase()}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                            Plan: {tenant.plan || 'Standard POS'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>Owner: <strong className="text-slate-800 dark:text-slate-200">{tenant.ownerName || 'Admin'}</strong></span>
                          <span>&bull;</span>
                          <span>Phone: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{tenant.ownerPhone || tenant.phone || '03364585863'}</strong></span>
                          <span>&bull;</span>
                          <span>City: <strong className="text-slate-800 dark:text-slate-200">{tenant.city || 'Pakistan'}</strong></span>
                          <span>&bull;</span>
                          <span>License: <code className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded text-[11px]">{tenant.licenseId || 'LIC-KEY'}</code></span>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 pt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Expiry: <strong className="font-mono text-slate-800 dark:text-slate-200">{isLifetime ? 'Lifetime Perpetual' : (tenant.trialExpiryDate?.slice(0, 10) || 'Active')}</strong>
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 font-medium">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            Deal: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatPkr(tenant.salePrice || 0)}</strong>
                          </span>
                          <span>&bull;</span>
                          <span className="text-slate-500">
                            Paid: <strong className="font-mono text-blue-600 dark:text-blue-300">{formatPkr(tenant.amountPaid || 0)}</strong>
                          </span>
                          {tenant.amountDue && tenant.amountDue > 0 ? (
                            <>
                              <span>&bull;</span>
                              <span className="text-amber-600 font-bold">
                                Due: {formatPkr(tenant.amountDue)}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {/* Right Fast Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Lock / Unlock Switch */}
                        <button
                          onClick={() => handleToggleLock(tenant.id || tenant.tenantId, tenant.status)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                            isLocked
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-rose-100 dark:bg-rose-950/80 hover:bg-rose-200 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                          }`}
                          title={isLocked ? 'Unlock access for company & sub-users' : 'Lock company & suspend sub-users immediately'}
                        >
                          {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          <span>{isLocked ? 'Unlock Company' : 'Lock Company'}</span>
                        </button>

                        {/* Extend Expiry Dropdown */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-bold text-slate-500 px-1.5">Extend:</span>
                          <button
                            onClick={() => handleExtendExpiry(tenant.id || tenant.tenantId, 7)}
                            className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-800 dark:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            +7d
                          </button>
                          <button
                            onClick={() => handleExtendExpiry(tenant.id || tenant.tenantId, 30)}
                            className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-800 dark:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            +30d
                          </button>
                          <button
                            onClick={() => handleExtendExpiry(tenant.id || tenant.tenantId, 365)}
                            className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-800 dark:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            +1Y
                          </button>
                          <button
                            onClick={() => handleExtendExpiry(tenant.id || tenant.tenantId, 'lifetime')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-sm"
                          >
                            Lifetime
                          </button>
                        </div>

                        {/* Plan Upgrade Selector */}
                        <select
                          value={tenant.plan || 'Basic'}
                          onChange={(e) => handleUpgradePlan(tenant.id || tenant.tenantId, e.target.value as any)}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <option value="Basic">Basic Silver</option>
                          <option value="Business">Business Gold</option>
                          <option value="Enterprise Multi-Branch">Enterprise Platinum</option>
                          <option value="Lifetime Perpetual">Lifetime Perpetual</option>
                        </select>

                        {/* Hardware Reset */}
                        {linkedLic && (
                          <button
                            onClick={() => handleResetMachineBinding(linkedLic.id, tenant.name)}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="Reset bound machine fingerprint (Allows transferring software to new PC)"
                          >
                            <HardDrive className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Pricing Deal */}
                        <button
                          onClick={() => handleOpenEditPricing(tenant)}
                          className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Deal Pricing</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ULTRA-ADVANCE PER-COMPANY FEATURE SWITCHBOARD MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'feature_matrix' && (
        <div className="space-y-6">
          {/* Target Company Selector & Category Filters */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span>Granular Per-Company Feature Switchboard</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select any company to enable or disable individual advanced features (e.g. unlock FEFO Expiry or FBR for a Basic customer without forcing a plan upgrade).
                </p>
              </div>

              {/* Target Company Picker */}
              <div className="w-full md:w-80">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Active Company Target:
                </label>
                <select
                  value={selectedTenantForFeatures}
                  onChange={(e) => setSelectedTenantForFeatures(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border-2 border-emerald-500 rounded-xl text-xs font-black text-slate-900 dark:text-white cursor-pointer shadow-sm"
                >
                  <option value="all">🌍 All Companies (Global Preview)</option>
                  {tenants.map(t => (
                    <option key={t.id || t.tenantId} value={t.tenantId || t.id}>
                      {t.name} — ({t.plan || 'Standard'} • {t.city || 'PK'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Feature Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-200 dark:border-slate-800">
              {[
                { id: 'all', label: 'All 18 Modules' },
                { id: 'Inventory & Expiry', label: '📦 Inventory & FEFO' },
                { id: 'Pricing & Margins', label: '💰 Pricing & Margins' },
                { id: 'Compliance & Tax', label: '🏛️ FBR & Compliance' },
                { id: 'AI & Automation', label: '🤖 AI & WhatsApp' },
                { id: 'Omnichannel & Security', label: '🌐 Online Store & Security' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFeatureCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    featureCategoryFilter === cat.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Matrix Switch Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatures.map((feat) => {
              // If a specific tenant is selected, show their actual toggle state
              const targetTenant = selectedTenantForFeatures !== 'all' 
                ? tenants.find(t => (t.id === selectedTenantForFeatures || t.tenantId === selectedTenantForFeatures))
                : null;

              const isEnabled = targetTenant ? isFeatureEnabledForTenant(targetTenant, feat.key) : false;

              return (
                <div 
                  key={feat.key}
                  className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm space-y-3 transition-all ${
                    targetTenant && isEnabled 
                      ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/10 dark:bg-emerald-950/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {feat.badge}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Tier: {feat.defaultInPlan}+
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white mt-1">
                        {feat.name}
                      </h4>
                    </div>

                    {/* Interactive Switch Toggle (Only active if tenant selected) */}
                    {targetTenant ? (
                      <button
                        onClick={() => handleToggleCompanyFeature(targetTenant.tenantId || targetTenant.id, feat.key, isEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        title={`Click to ${isEnabled ? 'DISABLE' : 'ENABLE'} this feature for ${targetTenant.name} & all sub-users`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        Select Company
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-mono">Key: {feat.key}</span>
                    {targetTenant && (
                      <span className={`font-black ${isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {isEnabled ? '● Active (Sub-Users Synced)' : '○ Locked'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT DEAL PRICING & PAYMENT LEDGER */}
      {/* ========================================================================= */}
      {isEditPricingModalOpen && selectedTenantForPricing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Update Deal Pricing &amp; Ledger</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{selectedTenantForPricing.name}</p>
              </div>
              <button
                onClick={() => setIsEditPricingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Agreed Sale Deal Price (PKR):
                </label>
                <input
                  type="number"
                  value={editPriceForm.salePrice}
                  onChange={(e) => setEditPriceForm({ ...editPriceForm, salePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Amount Paid / Received (PKR):
                </label>
                <input
                  type="number"
                  value={editPriceForm.amountPaid}
                  onChange={(e) => setEditPriceForm({ ...editPriceForm, amountPaid: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Status:
                  </label>
                  <select
                    value={editPriceForm.saleStatus}
                    onChange={(e) => setEditPriceForm({ ...editPriceForm, saleStatus: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                    <option value="Complimentary / Trial">Trial / Free</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Method:
                  </label>
                  <select
                    value={editPriceForm.paymentMethod}
                    onChange={(e) => setEditPriceForm({ ...editPriceForm, paymentMethod: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Sales Notes / Remarks:
                </label>
                <textarea
                  rows={2}
                  value={editPriceForm.notes}
                  onChange={(e) => setEditPriceForm({ ...editPriceForm, notes: e.target.value })}
                  placeholder="e.g. 1-Year renewal contract with 2 cashiers"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsEditPricingModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDealPricing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-emerald-600/30"
              >
                Save Pricing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ISSUE NEW LICENSE MODAL */}
      <LicenseActivationModal
        isOpen={isActivationModalOpen}
        onClose={() => setIsActivationModalOpen(false)}
        onSuccess={(msg) => {
          refreshAllData();
          toast(msg);
        }}
      />
    </div>
  );
};
