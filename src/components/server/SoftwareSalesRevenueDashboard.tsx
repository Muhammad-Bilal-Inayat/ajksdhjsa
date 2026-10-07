import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  DollarSign, TrendingUp, Users, Clock, AlertCircle, CheckCircle2,
  Share2, ArrowUpRight, Search, Plus, RefreshCw, Calendar, 
  CreditCard, ShieldCheck, FileText, Phone, Building2, ExternalLink,
  Award, PackageCheck, Calculator, Sparkles, Layers, Trophy,
  Percent, ArrowRight, Zap, BadgePercent, Check, Lock, Unlock,
  Sliders, Key, Smartphone, HardDrive, ShieldAlert, CheckSquare,
  Square, ChevronRight, Eye, UserCheck, Shield, HelpCircle, AlertTriangle,
  SlidersHorizontal, Settings, Flame, Star, CheckCircle, Tag, Copy,
  ChevronDown, ChevronUp, Bot, Database, BarChart3, LayoutGrid, FileCheck,
  Send, Server, Globe, Wifi, KeyRound, Terminal, Filter, Download,
  Printer, PieChart, Activity, Receipt, Wallet, CircleDot, ArrowDownRight,
  ArrowDown, ArrowUp, BarChart2, CheckCheck, MessageSquare
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
  getMasterActiveUsers,
  MasterActiveUser,
  Tenant
} from '../../lib/masterServerService';
import { DEFAULT_TENANT_FEATURE_TOGGLES } from '../../types';
import { LicenseActivationModal } from './LicenseActivationModal';

interface SoftwareSalesRevenueDashboardProps {
  onOpenNewLicense?: () => void;
  onOpenNewTenant?: () => void;
  onNotify?: (msg: string) => void;
}

// Ultra-Advance Feature Categories
export type FeatureCategory = 
  | 'Dashboard Widgets'
  | 'Pharmacy & DRAP'
  | 'Accounting & Tax'
  | 'Warehouse & Inventory'
  | 'AI & Automation'
  | 'Omnichannel & Security';

// Ultra-Advance Feature Definitions for Per-Company Granular Overrides
export interface FeatureDefinition {
  key: string;
  name: string;
  category: FeatureCategory;
  description: string;
  badge: string;
  color: string;
  defaultInPlan: 'Basic' | 'Business' | 'Enterprise';
}

export const ULTRA_ADVANCE_FEATURES: FeatureDefinition[] = [
  // 1. DASHBOARD WIDGETS & VISUAL KPI ANALYTICS
  {
    key: 'dashboard_financial_cards',
    name: 'Financial Cash Flow & Revenue Cards',
    category: 'Dashboard Widgets',
    description: 'Displays real-time daily cash in hand, receivables, payables, and gross profit KPI metrics on the top dashboard.',
    badge: 'Cash Flow',
    color: 'emerald',
    defaultInPlan: 'Basic'
  },
  {
    key: 'dashboard_sales_trend_chart',
    name: 'Sales Trend & Volume Chart (7d / 4w)',
    category: 'Dashboard Widgets',
    description: 'Interactive graphical analytics displaying weekly and monthly sales velocity and revenue trends.',
    badge: 'Trend Chart',
    color: 'indigo',
    defaultInPlan: 'Basic'
  },
  {
    key: 'dashboard_top_products',
    name: 'Top Selling Products & SKUs Widget',
    category: 'Dashboard Widgets',
    description: 'Ranks top 10 fastest moving medicines, total units sold, and high-velocity revenue contributors.',
    badge: 'Top Products',
    color: 'teal',
    defaultInPlan: 'Basic'
  },
  {
    key: 'dashboard_expiry_alerts',
    name: 'Near-Expiry 30/60/90-Day Warning Widget',
    category: 'Dashboard Widgets',
    description: 'Actionable radar highlighting stock nearing expiration date with 1-click supplier return notes.',
    badge: 'Expiry Board',
    color: 'amber',
    defaultInPlan: 'Business'
  },
  {
    key: 'dashboard_shortage_matrix',
    name: 'Medicine Shortage & Lost Demand Radar',
    category: 'Dashboard Widgets',
    description: 'Tracks unfulfilled patient prescriptions and out-of-stock items to auto-generate supplier PO orders.',
    badge: 'Shortage Radar',
    color: 'rose',
    defaultInPlan: 'Business'
  },
  {
    key: 'dashboard_khata_receivables',
    name: 'Customer & Supplier Khata Balance Board',
    category: 'Dashboard Widgets',
    description: 'Live overview of total pending receivables from credit customers and payable dues to distributors.',
    badge: 'Khata Board',
    color: 'purple',
    defaultInPlan: 'Basic'
  },
  {
    key: 'dashboard_cashier_shifts',
    name: 'Cashier Shift Drawer Reconciliation',
    category: 'Dashboard Widgets',
    description: 'Live active cashier drawer balance, cash in/out events, and shift closing difference calculations.',
    badge: 'Shift Drawer',
    color: 'sky',
    defaultInPlan: 'Basic'
  },
  {
    key: 'dashboard_live_margin_monitor',
    name: 'Live Real-Time Gross Margin Gauge',
    category: 'Dashboard Widgets',
    description: 'Monitors instantaneous gross profit percentage across daily transactions directly on the dashboard.',
    badge: 'Live Margins',
    color: 'emerald',
    defaultInPlan: 'Business'
  },

  // 2. PHARMACY, CLINICAL & DRAP COMPLIANCE
  {
    key: 'fefo_expiry_management',
    name: 'FEFO & Near-Expiry AI Picking Engine',
    category: 'Pharmacy & DRAP',
    description: 'Enforces First-Expiry-First-Out picking logic and automated 30/60/90-day expiry loss prevention alerts.',
    badge: 'FEFO',
    color: 'emerald',
    defaultInPlan: 'Business'
  },
  {
    key: 'narcotics_register',
    name: 'Controlled Drugs & Narcotics Register (DRAP)',
    category: 'Pharmacy & DRAP',
    description: 'Strict DRAP Form-8 regulatory recording, physician PMDC registration tracking, and narcotics batch logs.',
    badge: 'DRAP Form-8',
    color: 'rose',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'clinical_drug_interaction',
    name: 'Clinical Drug-to-Drug Interaction AI Alert',
    category: 'Pharmacy & DRAP',
    description: 'Real-time alert warning cashiers if prescribed medicines have hazardous clinical contraindications.',
    badge: 'Clinical Rx',
    color: 'purple',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'batch_management',
    name: 'Batch Number, Expiry Lot & Serial Tracking',
    category: 'Pharmacy & DRAP',
    description: 'Comprehensive batch number, manufacturing dates, and supplier lot tracking per transaction.',
    badge: 'Batches',
    color: 'blue',
    defaultInPlan: 'Business'
  },
  {
    key: 'doctor_prescriber_module',
    name: 'Doctor & Prescriber Referral Commission',
    category: 'Pharmacy & DRAP',
    description: 'Track consultant doctor prescriptions, patient referrals, and monthly commission settlement ledger.',
    badge: 'Doctors Rx',
    color: 'indigo',
    defaultInPlan: 'Enterprise'
  },

  // 3. ACCOUNTING, TAX & INVOICING
  {
    key: 'fbr_pos_integration',
    name: 'FBR Digital Invoicing & Tax QR Stamps',
    category: 'Accounting & Tax',
    description: 'Real-time integration with Federal Board of Revenue POS Tier-1 server with automated fiscal invoice numbers.',
    badge: 'FBR Tier-1',
    color: 'rose',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'journal_vouchers',
    name: 'Chart of Accounts & Double-Entry Journal Vouchers',
    category: 'Accounting & Tax',
    description: 'Full accounting module with General Ledger, Balance Sheet, P&L, Trial Balance, and Journal entries.',
    badge: 'GL & JV',
    color: 'sky',
    defaultInPlan: 'Enterprise'
  },
  {
    key: 'supplier_customer_khata',
    name: 'Supplier & Customer Ledger Khata Statements',
    category: 'Accounting & Tax',
    description: 'Complete debit/credit ledger history with PDF statement export and automated balance reconciliation.',
    badge: 'Khata Ledger',
    color: 'emerald',
    defaultInPlan: 'Basic'
  },
  {
    key: 'multiple_pricing_levels',
    name: 'Multi-Tier Wholesale & Retail Pricing Slabs',
    category: 'Accounting & Tax',
    description: 'Supports customer-specific rates, wholesale tier pricing, distributor slabs, and bulk quantity discounts.',
    badge: 'Tier Rates',
    color: 'teal',
    defaultInPlan: 'Business'
  },
  {
    key: 'custom_item_fields',
    name: 'Custom Product & Invoice Metadata Fields',
    category: 'Accounting & Tax',
    description: 'Add dynamic custom parameters (dosage strength, rack shelf, imported flag, warranty periods).',
    badge: 'Custom Fields',
    color: 'purple',
    defaultInPlan: 'Business'
  },
  {
    key: 'category_profit_heatmap',
    name: 'Category-Wise Profit & Loss Heatmap',
    category: 'Accounting & Tax',
    description: 'Visual financial analytics breaking down profit margins across medicine and surgical classifications.',
    badge: 'Heatmaps',
    color: 'indigo',
    defaultInPlan: 'Business'
  },
  {
    key: 'tax_withholding_slabs',
    name: 'Multi-Slab GST & Advance Tax Withholding',
    category: 'Accounting & Tax',
    description: 'Automated 1% / 0.5% advance tax withholding calculations for filer and non-filer commercial parties.',
    badge: 'Tax Slabs',
    color: 'amber',
    defaultInPlan: 'Enterprise'
  },

  // 4. MULTI-WAREHOUSE & INVENTORY
  {
    key: 'godowns',
    name: 'Multi-Godowns & Secondary Warehouse Hubs',
    category: 'Warehouse & Inventory',
    description: 'Unlimited warehouse locations, branch stock transfers, and godown-wise inventory segregation.',
    badge: 'Godowns',
    color: 'indigo',
    defaultInPlan: 'Business'
  },
  {
    key: 'shortage_registry',
    name: 'Shortage Registry & Lost Demand Analytics',
    category: 'Warehouse & Inventory',
    description: 'Tracks customer demand for out-of-stock medicines to generate automated supplier purchase orders.',
    badge: 'Shortage',
    color: 'amber',
    defaultInPlan: 'Business'
  },
  {
    key: 'barcode_label_studio',
    name: 'Barcode & QR Label Designer Studio',
    category: 'Warehouse & Inventory',
    description: 'Generate and print customized thermal barcode labels with price, batch, expiry, and shelf location.',
    badge: 'Barcodes',
    color: 'blue',
    defaultInPlan: 'Basic'
  },
  {
    key: 'demand_forecast',
    name: 'Automated Purchase Reordering & Forecast',
    category: 'Warehouse & Inventory',
    description: 'Predicts inventory reorder quantities based on historical sales velocity and seasonal demand trends.',
    badge: 'Forecasting',
    color: 'blue',
    defaultInPlan: 'Business'
  },
  {
    key: 'supplier_bill_matching',
    name: 'PO & Supplier Invoice Auto-Matching',
    category: 'Warehouse & Inventory',
    description: 'Automated 3-way matching between Purchase Orders, Goods Received Notes (GRN), and Supplier Invoices.',
    badge: '3-Way Match',
    color: 'teal',
    defaultInPlan: 'Enterprise'
  },

  // 5. AI, AUTOMATION & WHATSAPP
  {
    key: 'ai_assistant',
    name: 'AI Smart Pharmacy & Clinical Drug Assistant',
    category: 'AI & Automation',
    description: 'Intelligent drug interaction alerts, dosage recommendations, generic alternative substitutions, and supplier insights.',
    badge: 'AI Copilot',
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
    key: 'sms_customer_alerts',
    name: 'Bulk SMS Gateway for Customer Reminders',
    category: 'AI & Automation',
    description: 'Send automated SMS text alerts for payment receipts, prescription refills, and promotional campaigns.',
    badge: 'SMS Alerts',
    color: 'sky',
    defaultInPlan: 'Enterprise'
  },

  // 6. OMNICHANNEL, FLEET & FORENSIC SECURITY
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
  },
  {
    key: 'cloud_auto_backup',
    name: 'Automated Encrypted Cloud Database Backups',
    category: 'Omnichannel & Security',
    description: 'Scheduled daily/hourly automated database backups to encrypted secure cloud storage with 1-click restore.',
    badge: 'Cloud Backup',
    color: 'blue',
    defaultInPlan: 'Business'
  },
  {
    key: 'device_hardware_lock',
    name: 'Cryptographic Machine HWID & API Key Binding',
    category: 'Omnichannel & Security',
    description: 'Cryptographically binds POS terminal to licensed hardware motherboard ID and enforces API key authentication.',
    badge: 'HWID Lock',
    color: 'slate',
    defaultInPlan: 'Enterprise'
  }
];

// Available Standard & Custom Plans
export const AVAILABLE_PLANS = [
  {
    id: 'Basic',
    name: 'Basic (Silver Edition)',
    badge: '🥈 BASIC',
    tier: 'Basic',
    desc: 'Retail POS, sales, purchase bills, cash in hand, 2 Cashiers, 2 Firms.',
    color: 'slate'
  },
  {
    id: 'Business',
    name: 'Business (Gold Edition)',
    badge: '🥇 BUSINESS GOLD',
    tier: 'Business',
    desc: 'FEFO Expiry, Multi-Godowns, Live Profit Margins, Multi-Pricing, 5 Users.',
    color: 'amber'
  },
  {
    id: 'Pharmacy Pro',
    name: 'Pharmacy Pro Plus',
    badge: '💊 PHARMACY PRO',
    tier: 'Business',
    desc: 'Specialized for retail & distribution pharmacies with DRAP narcotics registry & batch tracking.',
    color: 'teal'
  },
  {
    id: 'Enterprise Multi-Branch',
    name: 'Enterprise Platinum Multi-Branch',
    badge: '💎 ENTERPRISE PLATINUM',
    tier: 'Enterprise',
    desc: 'FBR POS Tier-1, Online Web Store, Order Bookers, Full Audit Trail, Journal Vouchers, 15+ Users.',
    color: 'purple'
  },
  {
    id: 'Lifetime Perpetual',
    name: 'Ultimate Lifetime Perpetual',
    badge: '👑 LIFETIME PERPETUAL',
    tier: 'Enterprise',
    desc: 'Unlimited perpetual license, zero annual renewals, VIP Master server support.',
    color: 'emerald'
  },
  {
    id: 'Custom Plan',
    name: 'Custom Tailored Plan',
    badge: '🛠️ CUSTOM PLAN',
    tier: 'Enterprise',
    desc: 'Custom user seats, custom branches, and handpicked features for large enterprise clients.',
    color: 'sky'
  }
];

// Duration Options
export const DURATION_PRESETS = [
  // Trials
  { id: 'trial_3d', label: '3 Days Trial', days: 3, type: 'trial', badge: '⚡ 3-Day Flash' },
  { id: 'trial_10d', label: '10 Days Trial', days: 10, type: 'trial', badge: '⚡ 10-Day Trial' },
  { id: 'trial_15d', label: '15 Days Trial', days: 15, type: 'trial', badge: '⚡ 15-Day Pilot' },
  { id: 'trial_30d', label: '30 Days Trial', days: 30, type: 'trial', badge: '⚡ 1-Month Trial' },
  // Paid Subscriptions
  { id: 'monthly_30d', label: '1 Month (30 Days)', days: 30, type: 'paid', badge: '📅 Monthly' },
  { id: 'quarterly_90d', label: '3 Months (Quarterly)', days: 90, type: 'paid', badge: '📅 3 Months' },
  { id: 'half_yearly_180d', label: '6 Months (Bi-Annual)', days: 180, type: 'paid', badge: '📅 6 Months' },
  { id: 'yearly_365d', label: '1 Year (Annual)', days: 365, type: 'paid', badge: '⭐ 1 Year' },
  { id: 'years_2', label: '2 Years (730 Days)', days: 730, type: 'paid', badge: '⭐ 2 Years' },
  { id: 'years_3', label: '3 Years (1,095 Days)', days: 1095, type: 'paid', badge: '🔥 3 Years' },
  { id: 'years_5', label: '5 Years (1,825 Days)', days: 1825, type: 'paid', badge: '🚀 5 Years' },
  { id: 'lifetime', label: 'Lifetime Perpetual', days: 'lifetime', type: 'lifetime', badge: '♾️ Lifetime' },
  { id: 'custom_days', label: 'Custom Specific Date / Days', days: 'custom', type: 'custom', badge: '🎯 Custom' },
];

export const SoftwareSalesRevenueDashboard: React.FC<SoftwareSalesRevenueDashboardProps> = ({
  onOpenNewLicense,
  onOpenNewTenant,
  onNotify
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'companies' | 'feature_matrix' | 'overview'>('companies');

  // Core Data states
  const [metrics, setMetrics] = useState<SoftwareSalesMetrics>(() => getSoftwareSalesMetrics());
  const [tenants, setTenants] = useState<Tenant[]>(() => getAllTenants());
  const [licenses, setLicenses] = useState<ClientLicense[]>(() => getAllClientLicenses());
  const [activeUsers, setActiveUsers] = useState<MasterActiveUser[]>(() => getMasterActiveUsers());

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<string>('all');
  const [modalFeatureCategory, setModalFeatureCategory] = useState<string>('all');
  const [selectedTenantForFeatures, setSelectedTenantForFeatures] = useState<string>('all');
  const [expandedSubUsersTenantId, setExpandedSubUsersTenantId] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Overview Tab Specific States
  const [overviewTimeframe, setOverviewTimeframe] = useState<'all' | 'today' | 'week' | 'month' | 'quarter' | 'year'>('all');
  const [overviewViewMode, setOverviewViewMode] = useState<'consolidated' | 'ledger'>('consolidated');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDealForPayment, setSelectedDealForPayment] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amountPaying: 0,
    paymentMethod: 'Bank Transfer' as string,
    saleStatus: 'Paid' as 'Paid' | 'Partial' | 'Pending',
    notes: ''
  });
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedDealForReceipt, setSelectedDealForReceipt] = useState<any | null>(null);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  
  // Master Comprehensive Plan & License Governance Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedTenantForPlan, setSelectedTenantForPlan] = useState<Tenant | null>(null);

  // Form State for Plan & License Modal
  const [planForm, setPlanForm] = useState({
    plan: 'Basic' as string,
    customPlanName: '',
    durationPreset: 'yearly_365d',
    customDays: 30,
    customDate: '',
    status: 'Active' as 'Active' | 'Suspended' | 'Trial' | 'Expired',
    maxUsers: 5,
    maxFirms: 2,
    maxDevices: 3,
    apiKey: '',
    salePrice: 0,
    amountPaid: 0,
    saleStatus: 'Paid' as 'Paid' | 'Partial' | 'Pending' | 'Complimentary / Trial',
    paymentMethod: 'Bank Transfer' as 'Cash' | 'Bank Transfer' | 'EasyPaisa / JazzCash' | 'Cheque' | 'Other',
    notes: '',
    featureOverrides: {} as Record<string, boolean>
  });

  const toast = useCallback((msg: string) => {
    if (onNotify) onNotify(msg);
  }, [onNotify]);

  const refreshAllData = useCallback(async () => {
    try {
      // 1. Fetch live tenants from server API
      const res = await fetch('/api/fleet/tenants', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.tenants)) {
          const seen = new Set<string>();
          const serverTenants: Tenant[] = [];

          for (const rt of json.tenants) {
            if (!rt) continue;
            const cleanName = (rt.name || '').toLowerCase().trim();
            const cleanId = (rt.tenant_id || rt.id || '').toLowerCase().trim();
            if ((cleanName && seen.has(cleanName)) || (cleanId && seen.has(cleanId))) continue;
            if (cleanName) seen.add(cleanName);
            if (cleanId) seen.add(cleanId);

            const tid = rt.tenant_id || rt.id;
            serverTenants.push({
              id: rt.id || tid,
              tenantId: tid,
              organizationId: rt.organization_id || tid,
              licenseId: rt.license_id || rt.licenseId || `lic_${tid}`,
              name: rt.name,
              ownerName: rt.owner_name || rt.ownerName || 'Store Admin',
              ownerEmail: rt.owner_email || rt.ownerEmail || '',
              ownerPhone: rt.owner_phone || rt.ownerPhone || rt.phone || '',
              city: rt.city || 'Lahore',
              address: rt.address || '',
              plan: rt.plan || 'Pharmacy Pro',
              status: rt.status || 'Active',
              primaryAdminId: rt.primary_admin_id || `usr_${tid}`,
              primaryAdminEmail: rt.owner_email || rt.ownerEmail || '',
              trialStartDate: rt.created_at || new Date().toISOString(),
              trialExpiryDate: rt.trial_expiry_date || rt.trial_ends_at || 'Never (Lifetime)',
              isTrialActive: rt.status === 'Trial',
              trialExpired: false,
              paidLicenseActive: rt.status === 'Active',
              maxDevices: rt.max_devices || rt.maxDevices || 3,
              maxUsers: rt.max_users || rt.maxUsers || 5,
              maxFirms: rt.max_firms || rt.maxFirms || 2,
              features: rt.features || rt.customFeatures || (rt.features_json ? (typeof rt.features_json === 'string' ? JSON.parse(rt.features_json) : rt.features_json) : rt.feature_toggles) || (typeof localStorage !== 'undefined' && localStorage.getItem(`mbi_tenant_features_${tid}`) ? JSON.parse(localStorage.getItem(`mbi_tenant_features_${tid}`)!) : { ...DEFAULT_TENANT_FEATURE_TOGGLES }),
              customFeatures: rt.customFeatures || rt.features || (rt.features_json ? (typeof rt.features_json === 'string' ? JSON.parse(rt.features_json) : rt.features_json) : rt.feature_toggles) || (typeof localStorage !== 'undefined' && localStorage.getItem(`mbi_tenant_features_${tid}`) ? JSON.parse(localStorage.getItem(`mbi_tenant_features_${tid}`)!) : { ...DEFAULT_TENANT_FEATURE_TOGGLES }),
              featureToggles: rt.feature_toggles || rt.featureToggles || rt.features || (typeof localStorage !== 'undefined' && localStorage.getItem(`mbi_tenant_features_${tid}`) ? JSON.parse(localStorage.getItem(`mbi_tenant_features_${tid}`)!) : { ...DEFAULT_TENANT_FEATURE_TOGGLES }),
              salePrice: rt.sale_price || rt.salePrice || 0,
              amountPaid: rt.amount_paid || rt.amountPaid || 0,
              amountDue: Math.max(0, (rt.sale_price || rt.salePrice || 0) - (rt.amount_paid || rt.amountPaid || 0)),
              saleStatus: rt.sale_status || rt.saleStatus || 'Paid',
              paymentMethod: rt.payment_method || rt.paymentMethod || 'Bank Transfer',
              saleNotes: rt.sale_notes || rt.saleNotes || '',
              apiKey: rt.api_key || rt.apiKey || `mbi_live_key_${tid.slice(-6)}_${Date.now().toString(36).toUpperCase()}`,
              totalInvoicesCount: Number(rt.invoice_count) || Number(rt.total_invoices_count) || 0,
              totalProductsCount: 0,
              totalPartiesCount: 0,
              lastSyncAt: rt.updated_at || new Date().toISOString(),
              createdAt: rt.created_at || new Date().toISOString(),
              updatedAt: rt.updated_at || new Date().toISOString(),
            });
          }

          setTenants(serverTenants);
          localStorage.setItem('mbi_master_tenants_v1', JSON.stringify(serverTenants));
          localStorage.setItem('mbi_master_tenants_v3', JSON.stringify(serverTenants));
          localStorage.setItem('mbi_master_tenants', JSON.stringify(serverTenants));
        } else {
          setTenants(getAllTenants());
        }
      } else {
        setTenants(getAllTenants());
      }
    } catch (e) {
      setTenants(getAllTenants());
    }

    const updatedMetrics = getSoftwareSalesMetrics();
    const updatedLicenses = getAllClientLicenses();
    const updatedUsers = getMasterActiveUsers();

    setMetrics(updatedMetrics);
    setLicenses(updatedLicenses);
    setActiveUsers(updatedUsers);
  }, []);

  useEffect(() => {
    refreshAllData();

    const handleUpdate = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshAllData();
    };

    window.addEventListener('mbi-tenants-updated', handleUpdate);
    window.addEventListener('mbi-users-updated', handleUpdate);
    window.addEventListener('mbi-registration-leads-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    const poller = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refreshAllData();
    }, 20000);

    return () => {
      window.removeEventListener('mbi-tenants-updated', handleUpdate);
      window.removeEventListener('mbi-users-updated', handleUpdate);
      window.removeEventListener('mbi-registration-leads-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(poller);
    };
  }, [refreshAllData]);

  const formatPkr = (num: number) => {
    return 'Rs. ' + (num || 0).toLocaleString('en-PK');
  };

  // Helper: Generate or guarantee API Key for a tenant
  const getOrGenerateApiKey = (tenant: Tenant): string => {
    if (tenant.apiKey && tenant.apiKey.trim().length > 10) {
      return tenant.apiKey;
    }
    const cleanTid = (tenant.tenantId || tenant.id || '001').replace(/[^a-zA-Z0-9]/g, '').slice(-6);
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `mbi_live_key_${cleanTid}_${randomHex}`;
  };

  // Copy Key to Clipboard
  const handleCopyApiKey = (keyToCopy: string, identifier: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(keyToCopy);
      setCopiedKeyId(identifier);
      toast(`📋 API Key copied to clipboard: ${keyToCopy}`);
      setTimeout(() => setCopiedKeyId(null), 2500);
    }
  };

  // Regenerate API Key
  const handleRegenerateApiKey = async (tenantId: string) => {
    const target = tenants.find(t => t.id === tenantId || t.tenantId === tenantId);
    if (!target) return;

    const confirmRegen = window.confirm(
      `Are you sure you want to regenerate the API Key for ${target.name}? Any connected POS terminals using the old key will need to be re-authenticated.`
    );
    if (!confirmRegen) return;

    const cleanTid = (target.tenantId || target.id || '001').replace(/[^a-zA-Z0-9]/g, '').slice(-6);
    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newApiKey = `mbi_live_key_${cleanTid}_${randomHex}`;

    target.apiKey = newApiKey;
    target.isManualOverride = true;
    target.updatedAt = new Date().toISOString();
    saveTenant(target);

    // Reset license hardware machine fingerprint
    const licId = target.licenseId || `lic_${target.tenantId || target.id}`;
    try {
      resetLicenseHardware(licId);
    } catch (e) {}

    // Call server key generation endpoint to ensure DB synchronization & clear server HWID
    try {
      await fetch('/api/fleet/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: target.tenantId || target.id,
          newKey: newApiKey,
          tenantName: target.name,
          keyName: `${target.name} REST API Key`,
          environment: 'production',
          rateLimitPerMin: 5000,
          permissions: ['*']
        })
      });
    } catch (e) {}

    try {
      localStorage.setItem(`mbi_tenant_apikey_${target.tenantId || target.id}`, newApiKey);
    } catch (e) {}

    // Reset linked license bound HWID in state
    const linkedLicense = licenses.find(l => (l.licenseKey && l.licenseKey === target.licenseId) || ((l.clientName || '').toLowerCase() === (target.name || '').toLowerCase() && target.name));
    if (linkedLicense) {
      linkedLicense.boundHardwareIds = [];
      (linkedLicense as any).boundHwid = null;
      saveClientLicense(linkedLicense);
    }

    refreshAllData();
    toast(`🔑 New 1-Time Device Key generated for ${target.name}: ${newApiKey} (HWID unlinked so client can bind new PC)`);
  };

  // Get Sub-Users for a Tenant (Excludes Primary Admin/Owner to prevent dummy/duplicate rows)
  const getSubUsersForTenant = (tenant: Tenant): MasterActiveUser[] => {
    const tid = (tenant.tenantId || tenant.id || '').toLowerCase();
    if (!tid) return [];

    const seenUserIds = new Set<string>();

    return activeUsers.filter(u => {
      if (!u || !u.id) return false;
      const uid = String(u.id);
      if (seenUserIds.has(uid)) return false;

      const userTid = (u.tenantId || '').toLowerCase();
      // Strictly match by tenantId only
      if (!userTid || userTid !== tid) return false;

      const uRole = (u.role || '').toLowerCase();
      // Exclude primary admin or owner account (they are the store owner, not a sub-user)
      if (
        uRole === 'primary admin' ||
        uRole === 'store owner' ||
        uRole === 'owner' ||
        uid.endsWith('_admin') ||
        uid === tid ||
        (u as any).isPrimaryOwner ||
        (u as any).is_primary_owner ||
        (u as any).isPrimaryAdmin ||
        (u as any).is_primary_admin
      ) {
        return false;
      }

      seenUserIds.add(uid);
      return true;
    });
  };

  // =========================================================================
  // MASTER PLAN & DURATION MODAL OPENER
  // =========================================================================
  const handleOpenMasterPlanModal = (tenant: Tenant) => {
    setSelectedTenantForPlan(tenant);

    const existingFeatures = (tenant as any).features || (tenant as any).customFeatures || {};
    const isLifetime = tenant.trialExpiryDate === 'Lifetime' || (tenant.plan && tenant.plan.includes('Lifetime'));
    
    // Auto-detect duration preset
    let detectedPreset = isLifetime ? 'lifetime' : 'yearly_365d';
    if (tenant.status === 'Trial' || tenant.isTrialActive) {
      detectedPreset = 'trial_30d';
    }

    setPlanForm({
      plan: tenant.plan || 'Basic',
      customPlanName: (tenant.plan as string) === 'Custom Plan' ? (tenant as any).customPlanName || '' : '',
      durationPreset: detectedPreset,
      customDays: 30,
      customDate: tenant.trialExpiryDate && tenant.trialExpiryDate !== 'Lifetime' ? tenant.trialExpiryDate.slice(0, 10) : '',
      status: tenant.status || 'Active',
      maxUsers: tenant.maxUsers || 5,
      maxFirms: tenant.maxFirms || 2,
      maxDevices: tenant.maxDevices || 3,
      apiKey: tenant.apiKey || getOrGenerateApiKey(tenant),
      salePrice: tenant.salePrice || 0,
      amountPaid: tenant.amountPaid || 0,
      saleStatus: (tenant.saleStatus as any) || 'Paid',
      paymentMethod: (tenant.paymentMethod as any) || 'Bank Transfer',
      notes: tenant.saleNotes || '',
      featureOverrides: { ...existingFeatures }
    });

    setModalFeatureCategory('all');
    setIsPlanModalOpen(true);
  };

  // DIRECT MASTER BACKEND ACTION DISPATCHER (MariaDB Persistence)
  // =========================================================================
  const callLicenseActionApi = async (body: any) => {
    try {
      const res = await fetch('/api/admin/licenses/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-master-password': 'Ami7788!@',
          'x-emergency-key': '03082003'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Backend direct license action error, applying local state fallback:', err);
      return null;
    }
  };

  // Save changes from Master Plan & Duration Modal (Permanent & Non-Reverting)
  const handleSaveMasterPlanModal = async () => {
    if (!selectedTenantForPlan) return;

    const target = tenants.find(t => (t.id === selectedTenantForPlan.id || t.tenantId === selectedTenantForPlan.tenantId));
    if (!target) return;

    // 1. Calculate Expiry Date based on chosen duration
    let newExpiryStr = 'Lifetime';
    let isTrial = false;

    if (planForm.durationPreset === 'lifetime') {
      newExpiryStr = 'Lifetime';
      isTrial = false;
    } else if (planForm.durationPreset === 'custom_days') {
      if (planForm.customDate) {
        newExpiryStr = new Date(planForm.customDate + 'T23:59:59').toISOString();
      } else {
        const days = Number(planForm.customDays) || 30;
        newExpiryStr = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
      isTrial = planForm.status === 'Trial';
    } else {
      const preset = DURATION_PRESETS.find(p => p.id === planForm.durationPreset);
      if (preset && typeof preset.days === 'number') {
        newExpiryStr = new Date(Date.now() + preset.days * 24 * 60 * 60 * 1000).toISOString();
        isTrial = preset.type === 'trial';
      }
    }

    // 2. Update Tenant record (Mark manual override to guarantee zero automated reversion)
    target.plan = (planForm.plan === 'Custom Plan' && planForm.customPlanName ? planForm.customPlanName : planForm.plan) as any;
    target.status = planForm.status;
    target.isTrialActive = isTrial;
    target.paidLicenseActive = !isTrial && planForm.status === 'Active';
    target.trialExpired = planForm.status === 'Expired';
    target.trialExpiryDate = newExpiryStr;
    target.maxUsers = Number(planForm.maxUsers) || 5;
    target.maxFirms = Number(planForm.maxFirms) || 2;
    target.maxDevices = Number(planForm.maxDevices) || 3;
    target.apiKey = planForm.apiKey || getOrGenerateApiKey(target);
    target.isManualOverride = true;

    // Financial deal tracking
    target.salePrice = Number(planForm.salePrice) || 0;
    target.amountPaid = Number(planForm.amountPaid) || 0;
    target.amountDue = Math.max(0, target.salePrice - target.amountPaid);
    target.saleStatus = planForm.saleStatus;
    target.paymentMethod = planForm.paymentMethod;
    target.saleNotes = planForm.notes;

    // Feature overrides (Saved to all mirror fields for absolute compatibility)
    (target as any).features = { ...planForm.featureOverrides };
    (target as any).customFeatures = { ...planForm.featureOverrides };
    if (!target.featureToggles) target.featureToggles = {} as any;
    Object.entries(planForm.featureOverrides).forEach(([k, v]) => {
      (target.featureToggles as any)[k] = v;
    });

    target.updatedAt = new Date().toISOString();
    saveTenant(target);

    // Persist live to MariaDB & SQLite Master backend
    const actPromise = callLicenseActionApi({
      action: 'update_plan_suite',
      tenantId: target.tenantId || target.id,
      id: target.id,
      name: target.name,
      licenseKey: target.licenseId || `lic_${target.tenantId || target.id}`,
      plan: target.plan,
      status: target.status,
      expiryDate: newExpiryStr === 'Lifetime' ? '2099-12-31' : newExpiryStr,
      maxUsers: target.maxUsers,
      maxFirms: target.maxFirms,
      maxDevices: target.maxDevices,
      apiKey: target.apiKey,
      salePrice: target.salePrice,
      amountPaid: target.amountPaid,
      amountDue: target.amountDue,
      saleStatus: target.saleStatus,
      paymentMethod: target.paymentMethod,
      saleNotes: target.saleNotes,
      features: planForm.featureOverrides
    });

    const fleetPromise = fetch('/api/fleet/tenants/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: target.id || target.tenantId,
        tenant_id: target.tenantId || target.id,
        name: target.name,
        owner_name: target.ownerName,
        owner_phone: target.ownerPhone,
        owner_email: target.ownerEmail,
        city: target.city,
        address: target.address,
        plan: target.plan,
        status: target.status,
        api_key: target.apiKey,
        features_json: JSON.stringify(planForm.featureOverrides),
        trial_expiry_date: newExpiryStr === 'Lifetime' ? 'Lifetime' : newExpiryStr.slice(0, 10),
        max_users: target.maxUsers,
        max_firms: target.maxFirms,
        max_devices: target.maxDevices,
        sale_price: target.salePrice,
        amount_paid: target.amountPaid,
        sale_status: target.saleStatus,
        payment_method: target.paymentMethod,
        sale_notes: target.saleNotes
      })
    }).catch(() => {});

    await Promise.all([actPromise, fleetPromise]);

    // 3. Save explicitly to localStorage for sub-user instant permissions engine
    try {
      localStorage.setItem(`mbi_tenant_features_${target.tenantId || target.id}`, JSON.stringify(planForm.featureOverrides));
      localStorage.setItem(`mbi_tenant_apikey_${target.tenantId || target.id}`, target.apiKey);
    } catch (e) {}

    // 4. Update ClientLicense record
    const linkedLicense = licenses.find(l => (l.licenseKey && l.licenseKey === target.licenseId) || ((l.clientName || '').toLowerCase() === (target.name || '').toLowerCase() && target.name));
    if (linkedLicense) {
      linkedLicense.plan = target.plan as any;
      linkedLicense.status = target.status === 'Suspended' ? 'Suspended' : 'Active';
      linkedLicense.expiryDate = newExpiryStr;
      linkedLicense.maxDevices = target.maxDevices;
      linkedLicense.salePrice = target.salePrice;
      linkedLicense.amountPaid = target.amountPaid;
      linkedLicense.amountDue = target.amountDue;
      linkedLicense.saleStatus = target.saleStatus;
      linkedLicense.paymentMethod = target.paymentMethod;
      saveClientLicense(linkedLicense);
    }

    // 5. Broadcast real-time event to all connected sub-users and windows
    window.dispatchEvent(
      new CustomEvent('mbi-tenant-features-updated', {
        detail: { tenantId: target.tenantId || target.id, features: planForm.featureOverrides, plan: target.plan }
      })
    );
    window.dispatchEvent(new CustomEvent('mbi-tenants-updated', { detail: [target] }));

    logMasterAudit(
      'Plan & Features Governed',
      'LICENSE',
      `Master Admin assigned Plan [${target.plan}], Expiry [${newExpiryStr.slice(0, 10)}], API Key [${target.apiKey}] to ${target.name}. Features: ${Object.keys(planForm.featureOverrides).filter(k => planForm.featureOverrides[k]).length} active. (Synced to all sub-users)`,
      target.name
    );

    // Instant Optimistic State Update for zero latency and persistent display
    setTenants(prev => prev.map(t => (t.id === target.id || t.tenantId === target.tenantId ? { ...target } : t)));
    setLicenses(prev => prev.map(l => (l.licenseKey === target.licenseId ? { ...l, plan: target.plan as any, status: target.status === 'Suspended' ? 'Suspended' : 'Active', expiryDate: newExpiryStr } : l)));

    setIsPlanModalOpen(false);
    refreshAllData();
    toast(`🎉 Successfully assigned Plan [${target.plan}], Expiry & API Key for ${target.name}! Auto-synced without reversion.`);
  };

  // Quick 1-click Fast Extend
  const handleFastExtendExpiry = async (tenantId: string, daysToAdd: number | 'lifetime') => {
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
    target.isTrialActive = false;
    target.trialExpired = false;
    target.paidLicenseActive = true;
    target.isManualOverride = true;
    target.updatedAt = new Date().toISOString();

    saveTenant(target);

    // Sync license record
    const linkedLicense = licenses.find(l => (l.licenseKey && l.licenseKey === target.licenseId) || ((l.clientName || '').toLowerCase() === (target.name || '').toLowerCase() && target.name));
    if (linkedLicense) {
      linkedLicense.expiryDate = newExpiryStr;
      linkedLicense.status = 'Active';
      saveClientLicense(linkedLicense);
    }

    // Call MariaDB backend action endpoint
    await callLicenseActionApi({
      action: 'extend_days',
      tenantId: target.tenantId || target.id,
      days: daysToAdd === 'lifetime' ? 36500 : daysToAdd,
      exactDate: daysToAdd === 'lifetime' ? '2099-12-31' : newExpiryStr.slice(0, 10)
    });

    refreshAllData();
    toast(`✅ License extended for ${target.name} (${daysToAdd === 'lifetime' ? 'Lifetime Perpetual (2099-12-31)' : `+${daysToAdd} Days`}). Sub-users auto-synced!`);
  };

  const handleToggleLock = async (tenantId: string, currentStatus: string) => {
    const target = tenants.find(t => t.id === tenantId || t.tenantId === tenantId);
    if (!target) return;

    const isCurrentlyLocked = currentStatus === 'Suspended';
    const newStatus: Tenant['status'] = isCurrentlyLocked ? 'Active' : 'Suspended';

    target.status = newStatus;
    target.isManualOverride = true;
    target.paidLicenseActive = newStatus === 'Active';
    target.isTrialActive = false;
    target.updatedAt = new Date().toISOString();
    saveTenant(target);

    // Update linked license
    const linkedLicense = licenses.find(l => (l.licenseKey && l.licenseKey === target.licenseId) || ((l.clientName || '').toLowerCase() === (target.name || '').toLowerCase() && target.name));
    if (linkedLicense) {
      linkedLicense.status = newStatus === 'Suspended' ? 'Suspended' : 'Active';
      saveClientLicense(linkedLicense);
    }

    // Call MariaDB & SQLite backend action endpoint
    const actPromise = callLicenseActionApi({
      action: newStatus === 'Suspended' ? 'suspend' : 'reactivate',
      tenantId: target.tenantId || target.id,
      licenseKey: target.licenseId || `lic_${target.tenantId || target.id}`
    });

    const fleetStatusPromise = fetch('/api/fleet/tenants/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: target.tenantId || target.id,
        status: newStatus
      })
    }).catch(() => {});

    await Promise.all([actPromise, fleetStatusPromise]);

    logMasterAudit(
      newStatus === 'Suspended' ? 'Tenant Locked' : 'Tenant Unlocked',
      'SECURITY',
      `Company ${target.name} was ${newStatus === 'Suspended' ? 'LOCKED / SUSPENDED' : 'UNLOCKED'} by Master Admin. All sub-users ${newStatus === 'Suspended' ? 'locked out' : 'restored'}.`,
      target.name
    );

    // Instant Optimistic React State Update so Lock reflects with 0ms latency
    setTenants(prev => prev.map(t => (t.id === target.id || t.tenantId === target.tenantId ? { ...t, status: newStatus } : t)));
    setLicenses(prev => prev.map(l => (l.licenseKey === target.licenseId ? { ...l, status: newStatus === 'Suspended' ? 'Suspended' : 'Active' } : l)));

    refreshAllData();
    toast(
      newStatus === 'Suspended'
        ? `🔒 ${target.name} has been LOCKED. All sub-users are immediately blocked from transactions.`
        : `🔓 ${target.name} has been UNLOCKED. Access restored for all sub-users.`
    );
  };

  const handleResetMachineBinding = async (licenseKeyOrId: string, tenantName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to reset hardware machine fingerprints for ${tenantName}? This will allow the client to bind a new PC/Laptop.`
    );
    if (!confirmed) return;

    resetLicenseHardware(licenseKeyOrId);

    // Call MariaDB backend action endpoint
    await callLicenseActionApi({
      action: 'reset_fingerprint',
      licenseId: licenseKeyOrId,
      tenantId: selectedTenantForPlan?.tenantId || tenantName
    });

    refreshAllData();
    toast(`🔄 Hardware machine binding cleared for ${tenantName}. Client can now activate on a new device.`);
  };

  const handleToggleCompanyFeature = async (tenantId: string, featureKey: string, currentVal: boolean) => {
    const target = tenants.find(t => t.id === tenantId || t.tenantId === tenantId);
    if (!target) return;

    const newVal = !currentVal;
    const tid = target.tenantId || target.id;
    
    const existingFeatures = (target as any).features || (target as any).customFeatures || {};
    const updatedFeatures = {
      ...existingFeatures,
      [featureKey]: newVal
    };

    (target as any).features = updatedFeatures;
    (target as any).customFeatures = updatedFeatures;
    target.isManualOverride = true;

    if (target.featureToggles && featureKey in target.featureToggles) {
      (target.featureToggles as any)[featureKey] = newVal;
    }

    target.updatedAt = new Date().toISOString();

    // 1. Optimistically update local tenants state array so UI switch reflects instantly and stays persistent
    setTenants(prev => prev.map(t => (t.id === target.id || t.tenantId === target.tenantId) ? {
      ...t,
      features: updatedFeatures,
      customFeatures: updatedFeatures,
      featureToggles: updatedFeatures,
      updatedAt: target.updatedAt
    } : t));

    // 2. Persist locally to localStorage across keys
    try {
      localStorage.setItem(`mbi_tenant_features_${tid}`, JSON.stringify(updatedFeatures));
      localStorage.setItem(`mbi_tenant_overrides_${tid}`, JSON.stringify(updatedFeatures));
      localStorage.setItem(`mbi_plan_features_${tid}`, JSON.stringify(updatedFeatures));

      const activeTid = localStorage.getItem('mbi_active_tenant_id') || localStorage.getItem('mbi_active_business_id');
      if (activeTid === tid || !activeTid) {
        const mb = localStorage.getItem('mock_business');
        if (mb) {
          try {
            const parsed = JSON.parse(mb);
            localStorage.setItem('mock_business', JSON.stringify({ ...parsed, features: updatedFeatures, customFeatures: updatedFeatures, featureToggles: updatedFeatures }));
          } catch {}
        }
        const mt = localStorage.getItem('mbi_tenant');
        if (mt) {
          try {
            const parsed = JSON.parse(mt);
            localStorage.setItem('mbi_tenant', JSON.stringify({ ...parsed, features: updatedFeatures, customFeatures: updatedFeatures, featureToggles: updatedFeatures }));
          } catch {}
        }
      }
    } catch (e) {}

    saveTenant(target);

    // 3. Persist directly and authoritatively to Master SQLite server /api/fleet/tenants/save
    try {
      await fetch('/api/fleet/tenants/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: target.id || tid,
          tenant_id: tid,
          tenantId: tid,
          name: target.name,
          owner_name: target.ownerName,
          owner_phone: target.ownerPhone,
          owner_email: target.ownerEmail,
          city: target.city,
          address: target.address,
          plan: target.plan,
          status: target.status,
          api_key: target.apiKey,
          features: updatedFeatures,
          customFeatures: updatedFeatures,
          features_json: JSON.stringify(updatedFeatures),
          trial_expiry_date: target.trialExpiryDate,
          max_users: target.maxUsers,
          max_firms: target.maxFirms,
          max_devices: target.maxDevices,
          sale_price: target.salePrice,
          amount_paid: target.amountPaid,
          sale_status: target.saleStatus,
          payment_method: target.paymentMethod,
          sale_notes: target.saleNotes,
          updated_at: target.updatedAt
        })
      });
    } catch (err) {}

    // 4. Call backend license action API
    try {
      await callLicenseActionApi({
        action: 'update_features',
        tenantId: tid,
        licenseId: target.licenseId,
        features: updatedFeatures
      });
    } catch (err) {}

    window.dispatchEvent(
      new CustomEvent('mbi-tenant-features-updated', {
        detail: { tenantId: tid, features: updatedFeatures }
      })
    );

    logMasterAudit(
      'Feature Override Toggled',
      'SECURITY',
      `Master Admin ${newVal ? 'ENABLED' : 'DISABLED'} feature [${featureKey}] for company ${target.name}. (Auto-synced to all sub-users)`,
      target.name
    );

    toast(
      `⚡ [${featureKey}] ${newVal ? 'ENABLED (Unlocked)' : 'DISABLED (Revoked)'} for ${target.name} and ALL sub-users!`
    );
  };

  const isFeatureEnabledForTenant = (tenant: Tenant, featureKey: string): boolean => {
    const tid = tenant.tenantId || tenant.id;
    const custom = (tenant as any).features || (tenant as any).customFeatures;
    if (custom && typeof custom === 'object') {
      if (custom[featureKey] !== undefined) return Boolean(custom[featureKey]);
      const norm = featureKey.toLowerCase().replace(/[\s-_]/g, '');
      for (const [k, v] of Object.entries(custom)) {
        if (k.toLowerCase().replace(/[\s-_]/g, '') === norm && v !== undefined) {
          return Boolean(v);
        }
      }
    }

    try {
      const stored = localStorage.getItem(`mbi_tenant_features_${tid}`) || localStorage.getItem(`mbi_tenant_overrides_${tid}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[featureKey] !== undefined) return Boolean(parsed[featureKey]);
        const norm = featureKey.toLowerCase().replace(/[\s-_]/g, '');
        for (const [k, v] of Object.entries(parsed)) {
          if (k.toLowerCase().replace(/[\s-_]/g, '') === norm && v !== undefined) {
            return Boolean(v);
          }
        }
      }
    } catch (e) {}

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

  const handleShareWhatsAppDeal = (deal: any) => {
    if (!deal) return;
    const text = `*MBI INVENTRA CLOUD POS & ERP - MASTER LICENSE CONFIRMATION* 🧾%0A` +
      `---------------------------------------%0A` +
      `*Client Business:* ${deal.clientName || 'N/A'}%0A` +
      `*Software Plan:* ${deal.plan || 'Basic'}%0A` +
      `*License Key:* ${deal.licenseKey || 'N/A'}%0A` +
      `*Contract Value:* ${formatPkr(deal.salePrice || 0)}%0A` +
      `*Amount Paid:* ${formatPkr(deal.amountPaid || 0)}%0A` +
      `*Remaining Due:* ${formatPkr(deal.amountDue || 0)}%0A` +
      `*Status:* ${deal.saleStatus || 'Active'}%0A` +
      `*Deployment Mode:* Multi-Tenant Isolated Cloud Engine%0A` +
      `---------------------------------------%0A` +
      `Thank you for choosing MBI INVENTRA. Your POS enterprise platform is active and verified.%0A` +
      `*Master Support Hotline:* 03364585863 | 03281302636`;

    const cleanPhone = (deal.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('92') ? cleanPhone : 
                             cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    const url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${text}`;
    window.open(url, '_blank');
  };

  const handleShareWhatsAppPaymentReminder = (deal: any) => {
    const text = `*MBI INVENTRA POS & ERP - PAYMENT REMINDER NOTICE* ⚠️%0A` +
      `---------------------------------------%0A` +
      `*Client Business:* ${deal.clientName}%0A` +
      `*Software Plan:* ${deal.plan}%0A` +
      `*License Key:* ${deal.licenseKey}%0A` +
      `*Total Agreed Price:* ${formatPkr(deal.salePrice)}%0A` +
      `*Amount Paid:* ${formatPkr(deal.amountPaid)}%0A` +
      `*Outstanding Balance Due:* ${formatPkr(deal.amountDue)}%0A` +
      `*Payment Status:* ${deal.saleStatus.toUpperCase()}%0A` +
      `---------------------------------------%0A` +
      `Please clear the pending balance to keep your multi-tenant POS cloud backup and sync running without interruption.%0A` +
      `*Official Bank Account:* Ask Master Administrator%0A` +
      `*Master Support Hotline:* 03364585863 | 03281302636`;

    const cleanPhone = (deal.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('92') ? cleanPhone : 
                             cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    const url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${text}`;
    window.open(url, '_blank');
  };

  const handleOpenPaymentModal = (deal: any) => {
    setSelectedDealForPayment(deal);
    setPaymentForm({
      amountPaying: deal.amountDue > 0 ? deal.amountDue : 0,
      paymentMethod: deal.paymentMethod || 'Bank Transfer',
      saleStatus: 'Paid',
      notes: 'Payment recorded via Master Central Revenue Hub'
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePaymentSettle = async () => {
    if (!selectedDealForPayment) return;
    const additionalPaid = Number(paymentForm.amountPaying) || 0;
    const newPaidTotal = (selectedDealForPayment.amountPaid || 0) + additionalPaid;
    const newDue = Math.max(0, (selectedDealForPayment.salePrice || 0) - newPaidTotal);
    const newStatus = newDue === 0 ? 'Paid' : (newPaidTotal > 0 ? 'Partial' : 'Pending');

    // 1. Update Tenant in memory & local storage
    const targetTenant = tenants.find(t => 
      t.id === selectedDealForPayment.id || 
      t.tenantId === selectedDealForPayment.id || 
      t.licenseId === selectedDealForPayment.licenseKey ||
      (t.name || '').toLowerCase() === (selectedDealForPayment.clientName || '').toLowerCase()
    );

    if (targetTenant) {
      targetTenant.amountPaid = newPaidTotal;
      targetTenant.amountDue = newDue;
      targetTenant.saleStatus = newStatus as any;
      targetTenant.paymentMethod = paymentForm.paymentMethod as any;
      targetTenant.paidLicenseActive = true;
      if (newStatus === 'Paid' && targetTenant.status === 'Trial') {
        targetTenant.status = 'Active';
        targetTenant.isTrialActive = false;
      }
      saveTenant(targetTenant);

      fetch('/api/fleet/tenants/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetTenant.id || targetTenant.tenantId,
          tenant_id: targetTenant.tenantId || targetTenant.id,
          amount_paid: newPaidTotal,
          sale_status: newStatus,
          payment_method: paymentForm.paymentMethod,
          status: targetTenant.status
        })
      }).catch(() => {});
    }

    // 2. Update License in memory & local storage
    const targetLic = licenses.find(l => 
      l.id === selectedDealForPayment.id || 
      l.licenseKey === selectedDealForPayment.licenseKey ||
      (l.clientName || '').toLowerCase() === (selectedDealForPayment.clientName || '').toLowerCase()
    );

    if (targetLic) {
      targetLic.amountPaid = newPaidTotal;
      targetLic.amountDue = newDue;
      targetLic.saleStatus = newStatus as any;
      targetLic.paymentMethod = paymentForm.paymentMethod as any;
      saveClientLicense(targetLic);
    }

    logMasterAudit(
      'Payment Settle Recorded',
      'LICENSE',
      `Master Admin recorded +${formatPkr(additionalPaid)} payment for ${selectedDealForPayment.clientName} (Total Paid: ${formatPkr(newPaidTotal)}, Balance: ${formatPkr(newDue)})`,
      selectedDealForPayment.clientName
    );

    setIsPaymentModalOpen(false);
    refreshAllData();
    toast(`✅ Payment of ${formatPkr(additionalPaid)} recorded successfully for ${selectedDealForPayment.clientName}!`);
  };

  const handleOpenReceiptModal = (deal: any) => {
    setSelectedDealForReceipt(deal);
    setIsReceiptModalOpen(true);
  };

  // Export Revenue Ledger to Excel
  const handleExportExcelSales = () => {
    try {
      const rows = (overviewViewMode === 'consolidated' ? consolidatedStores : filteredDeals).map((d, index) => ({
        'Sr #': index + 1,
        'Company Name': d.clientName,
        'Owner / Contact Person': d.ownerName,
        'Phone Number': d.phone,
        'City': d.city,
        'Software Plan Tier': d.plan,
        'License Key': d.licenseKey,
        'Agreed Price (PKR)': d.salePrice,
        'Amount Paid (PKR)': d.amountPaid,
        'Balance Due (PKR)': d.amountDue,
        'Payment Status': d.saleStatus,
        'Payment Method': d.paymentMethod,
        'Issue / Sale Date': d.saleDate
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales_Revenue_Ledger');
      XLSX.writeFile(wb, `MBI_Inventra_Software_Sales_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast('📥 Master Software Sales Ledger downloaded as Excel (.xlsx)!');
    } catch (e) {
      console.error('Failed to export Excel:', e);
      toast('⚠️ Could not export Excel file. Please try again.');
    }
  };

  // Filtered Deals by Timeframe & Filters
  const filteredDeals = useMemo(() => {
    return metrics.recentDeals.filter(d => {
      const q = (searchTerm || '').toLowerCase().trim();
      const matchSearch = !q ||
        (d.clientName || '').toLowerCase().includes(q) ||
        (d.ownerName || '').toLowerCase().includes(q) ||
        (d.phone || '').toLowerCase().includes(q) ||
        (d.city || '').toLowerCase().includes(q) ||
        (d.licenseKey || '').toLowerCase().includes(q) ||
        (d.plan || '').toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (statusFilter !== 'all' && d.saleStatus !== statusFilter) return false;
      if (planFilter !== 'all' && d.plan !== planFilter) return false;

      // Timeframe filter
      if (overviewTimeframe !== 'all' && d.saleDate) {
        const dealDate = new Date(d.saleDate);
        const now = new Date();
        if (overviewTimeframe === 'today') {
          if (dealDate.toDateString() !== now.toDateString()) return false;
        } else if (overviewTimeframe === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (dealDate < weekAgo) return false;
        } else if (overviewTimeframe === 'month') {
          if (dealDate.getMonth() !== now.getMonth() || dealDate.getFullYear() !== now.getFullYear()) return false;
        } else if (overviewTimeframe === 'quarter') {
          const qNow = Math.floor(now.getMonth() / 3);
          const qDeal = Math.floor(dealDate.getMonth() / 3);
          if (qDeal !== qNow || dealDate.getFullYear() !== now.getFullYear()) return false;
        } else if (overviewTimeframe === 'year') {
          if (dealDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [metrics.recentDeals, searchTerm, statusFilter, planFilter, overviewTimeframe]);

  // Consolidated Deduplicated Companies Storefront View
  const consolidatedStores = useMemo(() => {
    const map = new Map<string, typeof filteredDeals[0]>();

    filteredDeals.forEach(deal => {
      const cleanName = (deal.clientName || '').toLowerCase().trim();
      if (!map.has(cleanName)) {
        map.set(cleanName, { ...deal });
      } else {
        const existing = map.get(cleanName)!;
        // Merge pricing if duplicate was recorded
        existing.salePrice = Math.max(existing.salePrice, deal.salePrice);
        existing.amountPaid = Math.max(existing.amountPaid, deal.amountPaid);
        existing.amountDue = Math.max(0, existing.salePrice - existing.amountPaid);
        if (deal.saleStatus === 'Paid' || existing.saleStatus !== 'Paid') {
          existing.saleStatus = deal.saleStatus;
        }
      }
    });

    return Array.from(map.values());
  }, [filteredDeals]);

  // Dynamic Computed Metrics for the Active Filtered View
  const computedOverviewMetrics = useMemo(() => {
    const list = overviewViewMode === 'consolidated' ? consolidatedStores : filteredDeals;
    let gross = 0;
    let collected = 0;
    let due = 0;
    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;
    let trialCount = 0;

    const planStats: Record<string, { count: number; rev: number; color: string }> = {
      'Basic': { count: 0, rev: 0, color: 'slate' },
      'Business': { count: 0, rev: 0, color: 'amber' },
      'Pharmacy Pro': { count: 0, rev: 0, color: 'teal' },
      'Enterprise Multi-Branch': { count: 0, rev: 0, color: 'purple' },
      'Lifetime Perpetual': { count: 0, rev: 0, color: 'emerald' },
      'Custom Plan': { count: 0, rev: 0, color: 'sky' }
    };

    const cityStats: Record<string, { count: number; rev: number }> = {};
    const monthlyTrendMap: Record<string, { label: string; revenue: number; collected: number; count: number }> = {};

    list.forEach(deal => {
      gross += deal.salePrice;
      collected += deal.amountPaid;
      due += deal.amountDue;

      if (deal.saleStatus === 'Paid') paidCount++;
      else if (deal.saleStatus === 'Partial') partialCount++;
      else if (deal.saleStatus === 'Pending') pendingCount++;
      else if (deal.saleStatus === 'Complimentary / Trial') trialCount++;

      const pKey = deal.plan.includes('Lifetime') ? 'Lifetime Perpetual' :
                   deal.plan.includes('Enterprise') ? 'Enterprise Multi-Branch' :
                   deal.plan.includes('Pharmacy Pro') ? 'Pharmacy Pro' :
                   deal.plan.includes('Business') ? 'Business' : 'Basic';

      if (!planStats[pKey]) planStats[pKey] = { count: 0, rev: 0, color: 'slate' };
      planStats[pKey].count += 1;
      planStats[pKey].rev += deal.salePrice;

      const cCity = deal.city || 'Lahore';
      if (!cityStats[cCity]) cityStats[cCity] = { count: 0, rev: 0 };
      cityStats[cCity].count += 1;
      cityStats[cCity].rev += deal.salePrice;

      // Monthly bucket
      const mDate = deal.saleDate ? new Date(deal.saleDate) : new Date();
      const monthKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = mDate.toLocaleString('default', { month: 'short' }) + ' ' + String(mDate.getFullYear()).slice(-2);
      if (!monthlyTrendMap[monthKey]) {
        monthlyTrendMap[monthKey] = { label: monthName, revenue: 0, collected: 0, count: 0 };
      }
      monthlyTrendMap[monthKey].revenue += deal.salePrice;
      monthlyTrendMap[monthKey].collected += deal.amountPaid;
      monthlyTrendMap[monthKey].count += 1;
    });

    const sortedMonthlyTrends = Object.entries(monthlyTrendMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => v);

    const sortedCities = Object.entries(cityStats)
      .map(([city, data]) => ({ city, count: data.count, rev: data.rev }))
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 5);

    const collectionRate = gross > 0 ? Math.round((collected / gross) * 100) : 0;
    const totalStores = list.length;
    const arpu = totalStores > 0 ? Math.round(gross / totalStores) : 0;
    const mrr = Math.round(gross / 12);
    const arr = gross;
    const conversionRate = totalStores > 0 ? Math.round((paidCount / totalStores) * 100) : 0;

    return {
      gross,
      collected,
      due,
      paidCount,
      partialCount,
      pendingCount,
      trialCount,
      totalStores,
      collectionRate,
      arpu,
      mrr,
      arr,
      conversionRate,
      planStats,
      sortedCities,
      sortedMonthlyTrends
    };
  }, [overviewViewMode, consolidatedStores, filteredDeals]);

  // Filtered Tenants (Companies Only)
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
        (t.apiKey || '').toLowerCase().includes(q) ||
        (t.plan || '').toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (planFilter !== 'all' && t.plan !== planFilter) return false;

      return true;
    });
  }, [tenants, searchTerm, statusFilter, planFilter]);

  // Filtered Features for Matrix Tab
  const filteredFeatures = useMemo(() => {
    return ULTRA_ADVANCE_FEATURES.filter(f => {
      if (featureCategoryFilter !== 'all' && f.category !== featureCategoryFilter) return false;
      if (searchTerm && searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        return (f.name || '').toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q) || (f.badge || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [featureCategoryFilter, searchTerm]);

  // Modal Filtered Features
  const modalFilteredFeatures = useMemo(() => {
    if (modalFeatureCategory === 'all') return ULTRA_ADVANCE_FEATURES;
    return ULTRA_ADVANCE_FEATURES.filter(f => f.category === modalFeatureCategory);
  }, [modalFeatureCategory]);

  return (
    <div className="space-y-6">
      {/* Master Hub Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm dark:shadow-xl transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Software Sales &amp; Master Revenue Hub</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/50">
                  Master Multi-Tenant Engine
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40">
                  Sub-User Auto-Sync Live
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full-proof license governance, API Key management, granular feature switchboard, and instant sub-user inheritance.
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
          { id: 'companies', label: 'Company Licenses & Fleet Governance', icon: Building2, badge: `${tenants.length} Companies` },
          { id: 'feature_matrix', label: 'Ultra-Advance Feature Matrix & Overrides', icon: Zap, badge: `${ULTRA_ADVANCE_FEATURES.length} Modules` },
          { id: 'overview', label: 'Overview & Sales Revenue', icon: DollarSign, badge: `${metrics.totalDealsCount} Deals` }
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
            <strong className="font-black text-slate-900 dark:text-white">Multi-Tenant Hard Isolation Guarantee:</strong> Any plan upgrade, expiry extension (Monthly, 1Y, 3Y, 5Y, Lifetime, or Trials), lock action, API Key assignment, or custom feature enabled for a company automatically propagates to all cashiers, billers, and sub-users in real-time. Data remains 100% logically isolated per <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">tenant_id</code>.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY LICENSES & FLEET GOVERNANCE (PRIMARY VIEW) */}
      {/* ========================================================================= */}
      {activeTab === 'companies' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by company name, owner, city, API Key, license ID..."
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
                <option value="Pharmacy Pro">Pharmacy Pro Plus</option>
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
                const subUsers = getSubUsersForTenant(tenant);
                const currentApiKey = tenant.apiKey || getOrGenerateApiKey(tenant);
                const isSubUsersExpanded = expandedSubUsersTenantId === (tenant.id || tenant.tenantId);

                // Count active custom features
                const customFeats = (tenant as any).features || (tenant as any).customFeatures || {};
                const activeCustomCount = Object.keys(customFeats).filter(k => customFeats[k]).length;

                return (
                  <div 
                    key={tenant.id || tenant.tenantId} 
                    className={`p-5 bg-white dark:bg-slate-900 border rounded-3xl shadow-sm transition-all space-y-4 ${
                      isLocked 
                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Left Company Identity */}
                      <div className="space-y-1.5 flex-1">
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
                          {activeCustomCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-500" />
                              {activeCustomCount} Custom Overrides
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>Owner: <strong className="text-slate-800 dark:text-slate-200">{tenant.ownerName || 'Admin'}</strong></span>
                          <span>&bull;</span>
                          <span>Phone: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{tenant.ownerPhone || tenant.phone || '03364585863'}</strong></span>
                          <span>&bull;</span>
                          <span>City: <strong className="text-slate-800 dark:text-slate-200">{tenant.city || 'Pakistan'}</strong></span>
                          <span>&bull;</span>
                          <span>Tenant ID: <code className="font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded text-[11px] font-bold">{tenant.tenantId || tenant.id}</code></span>
                          <span>&bull;</span>
                          <span>License: <code className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded text-[11px] font-bold">{tenant.licenseId || 'LIC-KEY'}</code></span>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 pt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Expiry: <strong className="font-mono text-slate-800 dark:text-slate-200">{isLifetime ? 'Lifetime Perpetual' : (tenant.trialExpiryDate?.slice(0, 10) || 'Active')}</strong>
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 font-medium">
                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                            Seats: <strong className="font-mono text-slate-800 dark:text-slate-200">{tenant.maxUsers || 5} Max</strong> ({subUsers.length} Active)
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

                      {/* Right Fast Action Controls & Master Popup Button */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 🌟 MASTER POPUP BUTTON: ALL PLANS & DURATION MODAL */}
                        <button
                          onClick={() => handleOpenMasterPlanModal(tenant)}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30 active:scale-95"
                          title="Open Master Plan & Duration Control Suite"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                          <span>Manage Plan &amp; Expiry Suite</span>
                        </button>

                        {/* Quick Fast Extend Pills */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => handleFastExtendExpiry(tenant.id || tenant.tenantId, 7)}
                            className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-800 dark:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            title="Quick +7 Days Extension"
                          >
                            +7d
                          </button>
                          <button
                            onClick={() => handleFastExtendExpiry(tenant.id || tenant.tenantId, 30)}
                            className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-800 dark:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            title="Quick +30 Days Extension"
                          >
                            +30d
                          </button>
                          <button
                            onClick={() => handleFastExtendExpiry(tenant.id || tenant.tenantId, 365)}
                            className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-800 dark:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            title="Quick +1 Year Extension"
                          >
                            +1Y
                          </button>
                          <button
                            onClick={() => handleFastExtendExpiry(tenant.id || tenant.tenantId, 1095)}
                            className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-800 dark:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            title="Quick +3 Years Extension"
                          >
                            +3Y
                          </button>
                          <button
                            onClick={() => handleFastExtendExpiry(tenant.id || tenant.tenantId, 1825)}
                            className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-800 dark:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            title="Quick +5 Years Extension"
                          >
                            +5Y
                          </button>
                          <button
                            onClick={() => handleFastExtendExpiry(tenant.id || tenant.tenantId, 'lifetime')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black cursor-pointer shadow-sm"
                            title="Activate Lifetime Perpetual"
                          >
                            Lifetime
                          </button>
                        </div>

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
                      </div>
                    </div>

                    {/* API Key & Sub-Users Status Strip */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                      {/* API Key Box with 1-Click Copy */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          <span>Tenant API Key:</span>
                        </span>
                        <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          {currentApiKey}
                        </code>
                        <button
                          onClick={() => handleCopyApiKey(currentApiKey, tenant.tenantId || tenant.id)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Copy API Key"
                        >
                          {copiedKeyId === (tenant.tenantId || tenant.id) ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRegenerateApiKey(tenant.tenantId || tenant.id)}
                          className="px-2 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-amber-300 dark:border-amber-800"
                          title="Generate new 1-time activation key & unlink previous machine HWID"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Regen</span>
                        </button>
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md text-[10px] font-black tracking-wide" title="Single Device HWID Enforcement: 1 Key binds exclusively to 1 authorized PC/device">
                          1 Key = 1 Device
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {linkedLic?.boundHardwareIds?.length || ((linkedLic as any)?.boundHwid && (linkedLic as any).boundHwid !== 'UNBOUND' ? 1 : 0)} / {tenant.maxDevices || 1} Bound
                        </span>
                      </div>

                      {/* Sub-Users Drawer Toggle */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedSubUsersTenantId(isSubUsersExpanded ? null : (tenant.id || tenant.tenantId))}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{subUsers.length} Sub-Users Registered</span>
                          {isSubUsersExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Sub-Users Expandable Drawer */}
                    {isSubUsersExpanded && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-500" />
                            <span>Active Staff &amp; Cashier Sub-Users for {tenant.name}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Auto-inheriting plan: <strong>{tenant.plan || 'Basic'}</strong>
                          </span>
                        </div>

                        {subUsers.length === 0 ? (
                          <div className="text-center py-4 text-slate-400 text-xs">
                            No additional cashiers or sub-users configured for this store yet. Primary admin has default access.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {subUsers.map((u) => (
                              <div
                                key={u.id}
                                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                    <span>{u.name}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Role: <strong className="text-slate-600 dark:text-slate-300">{u.role}</strong> &bull; {u.emailOrPhone || 'Local User'}
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {u.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ULTRA-ADVANCE PER-COMPANY FEATURE SWITCHBOARD MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'feature_matrix' && (
        <div className="space-y-6">
          {/* Target Company Selector & Category Filters */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span>Granular Per-Company Feature Switchboard ({ULTRA_ADVANCE_FEATURES.length} Modules)</span>
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
                { id: 'all', label: `All (${ULTRA_ADVANCE_FEATURES.length})` },
                { id: 'Dashboard Widgets', label: '📊 Dashboard Widgets' },
                { id: 'Pharmacy & DRAP', label: '💊 Pharmacy & DRAP' },
                { id: 'Accounting & Tax', label: '💰 Accounts & Tax' },
                { id: 'Warehouse & Inventory', label: '📦 Warehouse & Stock' },
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
              const targetTenant = selectedTenantForFeatures !== 'all' 
                ? tenants.find(t => (t.id === selectedTenantForFeatures || t.tenantId === selectedTenantForFeatures))
                : null;

              const isEnabled = targetTenant ? isFeatureEnabledForTenant(targetTenant, feat.key) : false;

              return (
                <div 
                  key={feat.key}
                  className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm space-y-3 transition-all flex flex-col justify-between ${
                    targetTenant && isEnabled 
                      ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/10 dark:bg-emerald-950/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {feat.badge}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Tier: {feat.defaultInPlan}+
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white mt-1 break-words">
                          {feat.name}
                        </h4>
                      </div>

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
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg shrink-0">
                          Select Store
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                      {feat.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-mono truncate mr-2">Key: {feat.key}</span>
                    {targetTenant && (
                      <span className={`font-black shrink-0 ${isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {isEnabled ? '● Active (Synced)' : '○ Disabled'}
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
      {/* TAB 3: ULTRA-ADVANCED EXECUTIVE SALES & REVENUE COMMAND CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Executive Control & Filter Bar */}
          <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Executive Revenue Intelligence &amp; Sales Dashboard</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time monetization telemetry, plan adoption curves, collection efficiency, and multi-tenant billing analytics.
                </p>
              </div>

              {/* View Mode Toggle: Consolidated vs All Deals */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setOverviewViewMode('consolidated')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      overviewViewMode === 'consolidated'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Deduplicated storefront ledger: 1 consolidated row per pharmacy"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>🏢 Consolidated Stores ({consolidatedStores.length})</span>
                  </button>
                  <button
                    onClick={() => setOverviewViewMode('ledger')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      overviewViewMode === 'ledger'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Full chronological transaction ledger of all issued deals"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>📜 All Deal Records ({filteredDeals.length})</span>
                  </button>
                </div>

                <button
                  onClick={handleExportExcelSales}
                  className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Timeframe & Multi-Filters Toolbar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {/* Timeframe selector pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'This Week' },
                  { id: 'month', label: 'This Month' },
                  { id: 'quarter', label: 'This Quarter' },
                  { id: 'year', label: 'This Year' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setOverviewTimeframe(t.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                      overviewTimeframe === t.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Secondary Filters */}
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                <div className="relative flex-1 md:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="all">All Payment Status</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial Dues</option>
                  <option value="Pending">Pending Dues</option>
                  <option value="Complimentary / Trial">Trial / Free</option>
                </select>

                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="all">All Plans</option>
                  <option value="Basic">Basic Silver</option>
                  <option value="Business">Business Gold</option>
                  <option value="Pharmacy Pro">Pharmacy Pro Plus</option>
                  <option value="Enterprise Multi-Branch">Enterprise Platinum</option>
                  <option value="Lifetime Perpetual">Lifetime Perpetual</option>
                </select>
              </div>
            </div>
          </div>

          {/* 6 Executive Performance Cards Deck */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Card 1: Gross Billed Sales */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 rounded-3xl shadow-sm space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span>Gross Pipeline</span>
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono pt-1">
                {formatPkr(computedOverviewMetrics.gross)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Total Value</span>
                <span className="font-bold text-emerald-600">{computedOverviewMetrics.totalStores} Deals</span>
              </div>
            </div>

            {/* Card 2: Cash Inflow Collected */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-500/30 rounded-3xl shadow-sm space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <span>Cash Inflow</span>
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono pt-1">
                {formatPkr(computedOverviewMetrics.collected)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Efficiency</span>
                <span className="font-bold text-blue-600">{computedOverviewMetrics.collectionRate}% Paid</span>
              </div>
            </div>

            {/* Card 3: Receivables Outstanding */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 rounded-3xl shadow-sm space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <span>Pending Balance</span>
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono pt-1">
                {formatPkr(computedOverviewMetrics.due)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Receivables</span>
                <span className="font-bold text-amber-600">{computedOverviewMetrics.pendingCount + computedOverviewMetrics.partialCount} Overdue</span>
              </div>
            </div>

            {/* Card 4: Fleet Deployment */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/30 rounded-3xl shadow-sm space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <span>Fleet Volume</span>
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono pt-1">
                {computedOverviewMetrics.totalStores} <span className="text-xs text-slate-400 font-sans font-normal">Stores</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Commercial</span>
                <span className="font-bold text-purple-600">{computedOverviewMetrics.paidCount} Paid</span>
              </div>
            </div>

            {/* Card 5: Estimated MRR & Run-rate */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-3xl shadow-sm space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <span>Run-rate (MRR)</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono pt-1">
                {formatPkr(computedOverviewMetrics.mrr)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Annual ARR</span>
                <span className="font-bold text-indigo-600">{formatPkr(computedOverviewMetrics.arr)}</span>
              </div>
            </div>

            {/* Card 6: ARPU & Conversion Index */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-500/30 rounded-3xl shadow-sm space-y-1 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                <span>Avg ARPU</span>
                <Award className="w-4 h-4" />
              </div>
              <div className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono pt-1">
                {formatPkr(computedOverviewMetrics.arpu)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Conversion</span>
                <span className="font-bold text-sky-600">{computedOverviewMetrics.conversionRate}% Rate</span>
              </div>
            </div>
          </div>

          {/* 4 Interactive Visual Analytical Charts & Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Chart 1: Monthly Sales & Inflow Volume Bars (7 cols) */}
            <div className="lg:col-span-7 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Monthly Sales Velocity &amp; Cash Inflow Stream</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gross software deal bookings vs actual liquid cash collected.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <div className="w-3 h-3 rounded-md bg-emerald-500" />
                    <span>Gross Billed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <div className="w-3 h-3 rounded-md bg-blue-500" />
                    <span>Collected Cash</span>
                  </div>
                </div>
              </div>

              {/* Visual Bars Container */}
              <div className="space-y-3 pt-2">
                {computedOverviewMetrics.sortedMonthlyTrends.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No timeline transactions recorded for selected period.
                  </div>
                ) : (
                  computedOverviewMetrics.sortedMonthlyTrends.map((trend, idx) => {
                    const maxVal = Math.max(1, ...computedOverviewMetrics.sortedMonthlyTrends.map(t => Math.max(t.revenue, t.collected)));
                    const revPct = Math.round((trend.revenue / maxVal) * 100);
                    const collPct = Math.round((trend.collected / maxVal) * 100);

                    return (
                      <div key={idx} className="space-y-1.5 p-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {trend.label}
                          </span>
                          <div className="flex items-center gap-3 font-mono text-[11px]">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatPkr(trend.revenue)}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-blue-600 dark:text-blue-400 font-bold">{formatPkr(trend.collected)}</span>
                            <span className="text-slate-400 text-[10px]">({trend.count} deals)</span>
                          </div>
                        </div>

                        {/* Double Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(5, revPct)}%` }} 
                              title={`Gross Billed: ${formatPkr(trend.revenue)}`}
                            />
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
                            <div 
                              className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(5, collPct)}%` }} 
                              title={`Collected Cash: ${formatPkr(trend.collected)}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chart 2: Plan Tier Market Share & Revenue Distribution (5 cols) */}
            <div className="lg:col-span-5 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-600" />
                  <span>Plan Tier Market Share &amp; Adoption</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown of client deployment volume across tiers.
                </p>
              </div>

              {/* Plan Distribution Progress Meters */}
              <div className="space-y-3 pt-1">
                {Object.entries(computedOverviewMetrics.planStats).map(([pName, pData]) => {
                  const pct = computedOverviewMetrics.gross > 0 
                    ? Math.round((pData.rev / computedOverviewMetrics.gross) * 100)
                    : (computedOverviewMetrics.totalStores > 0 ? Math.round((pData.count / computedOverviewMetrics.totalStores) * 100) : 0);

                  const colorClass = 
                    pName.includes('Lifetime') ? 'bg-emerald-500' :
                    pName.includes('Enterprise') ? 'bg-purple-500' :
                    pName.includes('Pharmacy Pro') ? 'bg-teal-500' :
                    pName.includes('Business') ? 'bg-amber-500' : 'bg-slate-500';

                  const textClass = 
                    pName.includes('Lifetime') ? 'text-emerald-600 dark:text-emerald-400' :
                    pName.includes('Enterprise') ? 'text-purple-600 dark:text-purple-400' :
                    pName.includes('Pharmacy Pro') ? 'text-teal-600 dark:text-teal-400' :
                    pName.includes('Business') ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300';

                  return (
                    <div key={pName} className="p-3 bg-slate-50/70 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{pName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                            {pData.count} Stores
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${textClass}`}>{formatPkr(pData.rev)}</span>
                          <span className="text-[11px] font-black text-slate-500 font-mono">({pct}%)</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
                          style={{ width: `${Math.max(3, pct)}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Geographic Clusters / Top Cities */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Top Regional Deployment Hubs</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {computedOverviewMetrics.sortedCities.map((c) => (
                    <div key={c.city} className="p-2 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl text-center">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{c.city}</div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">{c.count} Stores &bull; {formatPkr(c.rev)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Software Sales Ledger & Live Deals Feed (Deduplicated Stores OR All Deals) */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>
                    {overviewViewMode === 'consolidated' 
                      ? `Consolidated Client Storefront Ledger (${consolidatedStores.length} Unique Companies)` 
                      : `Live Deals & Transaction Feed (${filteredDeals.length} Deal Events)`}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {overviewViewMode === 'consolidated'
                    ? 'Deduplicated company view showing unified lifetime deal values and active license status.'
                    : 'Granular transaction feed recording every license issuance, renewal, and sale event.'}
                </p>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing <strong className="text-slate-900 dark:text-white font-mono">{(overviewViewMode === 'consolidated' ? consolidatedStores : filteredDeals).length}</strong> matching records
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-3.5">Company / Client Store</th>
                    <th className="py-3 px-3.5">Plan &amp; License Key</th>
                    <th className="py-3 px-3.5 text-right">Deal Price</th>
                    <th className="py-3 px-3.5 text-right">Paid / Balance Due</th>
                    <th className="py-3 px-3.5 text-center">Payment Status</th>
                    <th className="py-3 px-3.5 text-center">Issue Date</th>
                    <th className="py-3 px-3.5 text-right">Master Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {(overviewViewMode === 'consolidated' ? consolidatedStores : filteredDeals).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No company deal records match current search or filters.
                      </td>
                    </tr>
                  ) : (
                    (overviewViewMode === 'consolidated' ? consolidatedStores : filteredDeals).map((deal) => {
                      const matchedTenant = tenants.find(t => (t.name || '').toLowerCase() === (deal.clientName || '').toLowerCase() || t.tenantId === deal.id);
                      const isPaid = deal.saleStatus === 'Paid';
                      const isPending = deal.saleStatus === 'Pending' || deal.amountDue > 0;
                      const hasKey = Boolean(deal.licenseKey && deal.licenseKey.trim());
                      const isCopied = copiedKeyId === deal.licenseKey;

                      return (
                        <tr key={deal.id || deal.licenseKey} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors">
                          {/* Company / Store Details */}
                          <td className="py-3 px-3.5">
                            <div className="font-black text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                              <span>{deal.clientName}</span>
                              {matchedTenant?.status === 'Active' && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Store Online & Active" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span>Owner: <strong className="text-slate-700 dark:text-slate-300">{deal.ownerName}</strong></span>
                              <span>&bull;</span>
                              <span className="font-mono text-emerald-600">{deal.phone}</span>
                              <span>&bull;</span>
                              <span>{deal.city}</span>
                            </div>
                          </td>

                          {/* Plan & License Key */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                deal.plan.includes('Enterprise') || deal.plan.includes('Lifetime')
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                                  : deal.plan.includes('Business') || deal.plan.includes('Pharmacy Pro')
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {deal.plan}
                              </span>
                            </div>
                            {hasKey && (
                              <div className="flex items-center gap-1 mt-1">
                                <code className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                                  {deal.licenseKey}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleCopyApiKey(deal.licenseKey, deal.licenseKey)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Copy License Key"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Deal Price */}
                          <td className="py-3 px-3.5 text-right font-black font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                            {formatPkr(deal.salePrice)}
                          </td>

                          {/* Paid / Due */}
                          <td className="py-3 px-3.5 text-right font-mono">
                            <div className="text-blue-600 dark:text-blue-400 font-bold text-xs">
                              Paid: {formatPkr(deal.amountPaid)}
                            </div>
                            {deal.amountDue > 0 ? (
                              <div className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                Due: {formatPkr(deal.amountDue)}
                              </div>
                            ) : (
                              <div className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                Settle 100%
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              isPaid
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                : deal.saleStatus === 'Partial'
                                ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                                : deal.saleStatus === 'Complimentary / Trial'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                            }`}>
                              {deal.saleStatus}
                            </span>
                          </td>

                          {/* Sale Date */}
                          <td className="py-3 px-3.5 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {deal.saleDate || 'Active'}
                          </td>

                          {/* Actions Suite */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Settle / Record Payment Button */}
                              {deal.amountDue > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaymentModal(deal)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs transition active:scale-95"
                                  title="Record or settle cash/bank payment"
                                >
                                  <Wallet className="w-3 h-3" />
                                  <span>Settle</span>
                                </button>
                              )}

                              {/* WhatsApp Deal Confirmation */}
                              <button
                                type="button"
                                onClick={() => handleShareWhatsAppDeal(deal)}
                                className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-bold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 cursor-pointer transition hover:bg-emerald-100"
                                title="Send License Receipt on WhatsApp"
                              >
                                <Share2 className="w-3 h-3 text-emerald-600" />
                                <span>WhatsApp</span>
                              </button>

                              {/* WhatsApp Payment Reminder (if overdue) */}
                              {deal.amountDue > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleShareWhatsAppPaymentReminder(deal)}
                                  className="px-2 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-lg text-[10px] font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1 cursor-pointer transition hover:bg-amber-100"
                                  title="Send Payment Due Reminder on WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3 text-amber-600" />
                                  <span>Reminder</span>
                                </button>
                              )}

                              {/* Master Invoice / Receipt */}
                              <button
                                type="button"
                                onClick={() => handleOpenReceiptModal(deal)}
                                className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="View & Print Official Master License Invoice"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Plan in Master Modal */}
                              {matchedTenant && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenMasterPlanModal(matchedTenant)}
                                  className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Manage Company Plan & Feature Governance"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </button>
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

      {/* ========================================================================= */}
      {/* 🌟 MASTER POPUP: COMPREHENSIVE PLAN, DURATION & FEATURE GOVERNANCE MODAL */}
      {/* ========================================================================= */}
      {isPlanModalOpen && selectedTenantForPlan && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-4xl space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Plan, Expiry, API Key &amp; Feature Governance Suite</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Company: <strong className="text-slate-900 dark:text-white font-bold">{selectedTenantForPlan.name}</strong> ({selectedTenantForPlan.city || 'Pakistan'}) &bull; Tenant ID: <code className="font-mono text-purple-600">{selectedTenantForPlan.tenantId || selectedTenantForPlan.id}</code> &bull; License: <code className="font-mono text-blue-600">{selectedTenantForPlan.licenseId || 'KEY'}</code>
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-300 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* SECTION 1: SELECT PLAN TIER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>1. Select Software Plan Tier</span>
                </label>
                <span className="text-[11px] text-slate-400">Current: <strong>{selectedTenantForPlan.plan || 'Basic'}</strong></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_PLANS.map((plan) => {
                  const isSelected = planForm.plan === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setPlanForm({ ...planForm, plan: plan.id })}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{plan.name}</span>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {plan.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                          {plan.desc}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-mono">Tier: {plan.tier}</span>
                        {isSelected && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* If Custom Plan is selected */}
              {planForm.plan === 'Custom Plan' && (
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl space-y-2 animate-in fade-in">
                  <label className="text-xs font-bold text-sky-900 dark:text-sky-200 block">
                    Custom Plan Name:
                  </label>
                  <input
                    type="text"
                    value={planForm.customPlanName}
                    onChange={(e) => setPlanForm({ ...planForm, customPlanName: e.target.value })}
                    placeholder="e.g. Enterprise Special VIP Edition"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* SECTION 2: SELECT DURATION / EXPIRY */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>2. Select License Duration / Expiry Period</span>
              </label>

              {/* Duration Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {DURATION_PRESETS.map((preset) => {
                  const isSelected = planForm.durationPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setPlanForm({ ...planForm, durationPreset: preset.id })}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/40 shadow-sm ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {preset.badge}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {preset.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Input if Custom selected */}
              {planForm.durationPreset === 'custom_days' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Exact Expiry Date:
                    </label>
                    <input
                      type="date"
                      value={planForm.customDate}
                      onChange={(e) => setPlanForm({ ...planForm, customDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Or +N Custom Days:
                    </label>
                    <input
                      type="number"
                      value={planForm.customDays}
                      onChange={(e) => setPlanForm({ ...planForm, customDays: Number(e.target.value) })}
                      placeholder="e.g. 45"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: USER SEATS, LIMITS & API KEY */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-purple-600" />
                <span>3. User Seats, Fleet Limits &amp; Company API Key</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Max Sub-Users / Cashiers:
                  </label>
                  <input
                    type="number"
                    value={planForm.maxUsers}
                    onChange={(e) => setPlanForm({ ...planForm, maxUsers: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Max Firms / Companies:
                  </label>
                  <input
                    type="number"
                    value={planForm.maxFirms}
                    onChange={(e) => setPlanForm({ ...planForm, maxFirms: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Max Devices Bound:
                  </label>
                  <input
                    type="number"
                    value={planForm.maxDevices}
                    onChange={(e) => setPlanForm({ ...planForm, maxDevices: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* API Key Field */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="space-y-0.5 flex-1 w-full">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Cryptographic Company API Key:
                  </span>
                  <input
                    type="text"
                    value={planForm.apiKey}
                    onChange={(e) => setPlanForm({ ...planForm, apiKey: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cleanTid = (selectedTenantForPlan.tenantId || selectedTenantForPlan.id || '001').replace(/[^a-zA-Z0-9]/g, '').slice(-6);
                    const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
                    setPlanForm({ ...planForm, apiKey: `mbi_live_key_${cleanTid}_${randomHex}` });
                  }}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 mt-2 sm:mt-4 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Key</span>
                </button>
              </div>

              {/* HWID Hardware Fingerprint Reset Action */}
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>Hardware Binding &amp; Machine HWID Fingerprint</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Clear bound PC hardware signatures in MariaDB to permit immediate license activation on a fresh or replacement machine.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTenantForPlan) {
                      const linkedLic = licenses.find(l => l.licenseKey === selectedTenantForPlan.licenseId || l.clientName.toLowerCase() === selectedTenantForPlan.name.toLowerCase());
                      handleResetMachineBinding(linkedLic?.id || selectedTenantForPlan.licenseId || selectedTenantForPlan.id, selectedTenantForPlan.name);
                    }
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm transition active:scale-95"
                  title="Clear bound hardware signatures for this company"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>🔄 Reset HWID Fingerprint</span>
                </button>
              </div>
            </div>

            {/* SECTION 4: PER-COMPANY ULTRA-ADVANCE FEATURE SWITCHBOARD */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>4. Granular Advanced Feature Overrides ({ULTRA_ADVANCE_FEATURES.length} Modules)</span>
                </label>

                {/* Bulk Quick Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const allEnabled: Record<string, boolean> = {};
                      ULTRA_ADVANCE_FEATURES.forEach(f => { allEnabled[f.key] = true; });
                      setPlanForm({ ...planForm, featureOverrides: allEnabled });
                    }}
                    className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanForm({ ...planForm, featureOverrides: {} });
                    }}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Category Pills in Modal */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All Modules' },
                  { id: 'Dashboard Widgets', label: '📊 Widgets' },
                  { id: 'Pharmacy & DRAP', label: '💊 Pharmacy' },
                  { id: 'Accounting & Tax', label: '💰 Accounting' },
                  { id: 'Warehouse & Inventory', label: '📦 Warehouse' },
                  { id: 'AI & Automation', label: '🤖 AI' },
                  { id: 'Omnichannel & Security', label: '🌐 Security' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setModalFeatureCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                      modalFeatureCategory === cat.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Feature Grid with Fixed Overflow & Proper Box Sizing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {modalFilteredFeatures.map((feat) => {
                  const isChecked = Boolean(planForm.featureOverrides[feat.key]);
                  return (
                    <div
                      key={feat.key}
                      onClick={() => {
                        setPlanForm({
                          ...planForm,
                          featureOverrides: {
                            ...planForm.featureOverrides,
                            [feat.key]: !isChecked
                          }
                        });
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 text-slate-900 dark:text-white ring-1 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="text-xs font-bold truncate" title={feat.name}>{feat.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{feat.badge} &bull; Tier {feat.defaultInPlan}+</div>
                      </div>

                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                        isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 5: COMMERCIAL PRICING & PAYMENT LEDGER */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>5. Commercial Deal Pricing &amp; Payment Ledger</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Agreed Sale Price (PKR):
                  </label>
                  <input
                    type="number"
                    value={planForm.salePrice}
                    onChange={(e) => setPlanForm({ ...planForm, salePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Amount Paid (PKR):
                  </label>
                  <input
                    type="number"
                    value={planForm.amountPaid}
                    onChange={(e) => setPlanForm({ ...planForm, amountPaid: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Status:
                  </label>
                  <select
                    value={planForm.saleStatus}
                    onChange={(e) => setPlanForm({ ...planForm, saleStatus: e.target.value as any })}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                    <option value="Complimentary / Trial">Trial / Free</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Total Balance Due: <strong className="font-mono text-amber-600 font-bold">{formatPkr(Math.max(0, planForm.salePrice - planForm.amountPaid))}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMasterPlanModal}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-emerald-600/30 active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Plan &amp; Sync Sub-Users</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💰 MODAL: RECORD & SETTLE PAYMENT MODAL */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && selectedDealForPayment && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Record &amp; Settle Deal Payment</h3>
                  <p className="text-[11px] text-slate-500 truncate">{selectedDealForPayment.clientName} &bull; {selectedDealForPayment.plan}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Financial Status Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">Deal Price</span>
                <span className="font-black text-slate-900 dark:text-white">{formatPkr(selectedDealForPayment.salePrice)}</span>
              </div>
              <div>
                <span className="text-[9px] text-blue-500 uppercase font-sans font-bold block">Already Paid</span>
                <span className="font-black text-blue-600">{formatPkr(selectedDealForPayment.amountPaid)}</span>
              </div>
              <div>
                <span className="text-[9px] text-amber-500 uppercase font-sans font-bold block">Balance Due</span>
                <span className="font-black text-amber-600">{formatPkr(selectedDealForPayment.amountDue)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Amount Received (PKR):
                </label>
                <input
                  type="number"
                  value={paymentForm.amountPaying}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountPaying: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Method / Channel:
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                >
                  <option value="Bank Transfer">Bank Transfer (HBL / Meezan / Alfalah)</option>
                  <option value="Cash in Hand">Direct Cash Handover</option>
                  <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash Digital</option>
                  <option value="Cheque Deposit">Bank Cheque Clearance</option>
                  <option value="Online Payment Gateway">Online Gateway / Card</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePaymentSettle}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save &amp; Update Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📄 MODAL: OFFICIAL MASTER LICENSE RECEIPT & INVOICE PREVIEW */}
      {/* ========================================================================= */}
      {isReceiptModalOpen && selectedDealForReceipt && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Official Software License Receipt</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Voucher Body */}
            <div ref={receiptPrintRef} className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 font-sans text-xs">
              <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="text-base font-black text-slate-900 dark:text-white tracking-wide">MBI INVENTRA POS &amp; ERP</div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">Software Sales &amp; License Provision Receipt</div>
                <div className="text-[10px] text-slate-400 mt-1">Official Master Authorization &bull; 24/7 Support: 0336-4585863</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Licensed To:</span>
                  <strong className="text-slate-900 dark:text-white text-xs block">{selectedDealForReceipt.clientName}</strong>
                  <div className="text-slate-500 mt-0.5">{selectedDealForReceipt.ownerName} &bull; {selectedDealForReceipt.city}</div>
                  <div className="text-slate-500 font-mono">{selectedDealForReceipt.phone}</div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Issue Details:</span>
                  <div className="font-mono text-slate-700 dark:text-slate-300">{selectedDealForReceipt.saleDate}</div>
                  <div className="font-bold text-emerald-600">{selectedDealForReceipt.plan}</div>
                  <div className="text-[10px] text-slate-400">{selectedDealForReceipt.paymentMethod}</div>
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[9px] font-bold uppercase text-slate-400 block">Cryptographic License Key:</span>
                <code className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 select-all block mt-0.5 break-all">
                  {selectedDealForReceipt.licenseKey}
                </code>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 font-mono text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Agreed Software Price:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatPkr(selectedDealForReceipt.salePrice)}</span>
                </div>
                <div className="flex justify-between text-blue-600 dark:text-blue-400 font-bold">
                  <span>Total Amount Paid:</span>
                  <span>{formatPkr(selectedDealForReceipt.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Balance Outstanding Due:</span>
                  <span>{formatPkr(selectedDealForReceipt.amountDue)}</span>
                </div>
              </div>

              <div className="text-[9px] text-center text-slate-400 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                This computer-generated master software receipt confirms authentic license entitlement on MBI INVENTRA.
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleShareWhatsAppDeal(selectedDealForReceipt)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Send WhatsApp Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE NEW LICENSE MODAL */}
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
