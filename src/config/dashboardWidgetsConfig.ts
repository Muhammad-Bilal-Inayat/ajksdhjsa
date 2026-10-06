export type PlanTier = 'silver' | 'gold' | 'platinum' | 'basic' | 'business' | 'enterprise';
export type WidgetZone = 'main' | 'sidebar';
export type WidgetCategory = 'kpi' | 'sales' | 'inventory' | 'finance' | 'security' | 'operations';

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  description: string;
  zone: WidgetZone;
  minPlan: PlanTier;
  defaultVisible: boolean;
  category: WidgetCategory;
  badge?: string;
}

export const PLAN_ORDER: Record<string, number> = {
  silver: 1,
  basic: 1,
  standard: 1,
  trial: 1,
  gold: 2,
  business: 2,
  pro: 2,
  platinum: 3,
  enterprise: 3,
  vip: 3,
  premium: 3,
};

export const PLAN_WIDGET_LIMITS: Record<string, number> = {
  silver: 10,
  basic: 10,
  gold: 18,
  business: 18,
  platinum: 24,
  enterprise: 24,
};

export const DASHBOARD_WIDGETS_CONFIG: DashboardWidgetConfig[] = [
  // ─── SILVER BASIC (10 Widgets) ──────────────────────────────────
  {
    id: 'pharmacy_erp_kpi_metrics',
    title: 'Executive Pharmacy KPI Metrics',
    description: 'Weekly Revenue, Gross Profit Margin, Invoices Cleared velocity, and FEFO 99.8% Zero Loss tracking.',
    zone: 'main',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'kpi',
    badge: 'Core KPI',
  },
  {
    id: 'todays_profit',
    title: "Today's Profit & Margins",
    description: "Real-time gross/net profit, cost of goods sold (COGS), and profit margin % for today's transactions.",
    zone: 'main',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'finance',
    badge: 'Profit',
  },
  {
    id: 'recent_sales',
    title: 'Recent Sales Invoices',
    description: 'Latest sales invoices feed with customer details, item counts, payment modes, and quick invoice reprint.',
    zone: 'main',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'sales',
  },
  {
    id: 'top_products',
    title: 'Top Selling Medicines',
    description: 'High-turnover pharmaceutical products ranked by volume and revenue with quick sell shortcuts.',
    zone: 'main',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'sales',
    badge: 'High Velocity',
  },
  {
    id: 'stock_inventory',
    title: 'Basic Stock Valuation',
    description: 'Total wholesale catalog inventory value and live active medicine count.',
    zone: 'sidebar',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'inventory',
  },
  {
    id: 'low_stock_alerts',
    title: 'Low Stock Alerts',
    description: 'Critical inventory depletion warning list with stock quantities and 1-click purchase order restock.',
    zone: 'sidebar',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'inventory',
    badge: 'Action Required',
  },
  {
    id: 'sales_expenses',
    title: 'Sales & Daily Expenses',
    description: 'Total billing turnover with visual area charts and categorized operational pharmacy expenses.',
    zone: 'main',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'finance',
  },
  {
    id: 'sales_trend',
    title: 'Sales Trend Velocity',
    description: 'Daily and weekly revenue demand patterns and peak pharmacy sales velocity hours.',
    zone: 'main',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'sales',
  },
  {
    id: 'bank_accounts',
    title: 'Counter Cash-in-Hand',
    description: 'Counter cash register drawer balance and commercial bank accounts.',
    zone: 'sidebar',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'finance',
  },
  {
    id: 'privacy_mode',
    title: 'Privacy & Counter Mask Mode',
    description: 'Quick toggle to blur figures and mask customer amounts on public pharmacy counter displays.',
    zone: 'sidebar',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'security',
    badge: 'POS Screen',
  },
  {
    id: 'expiry_alerts',
    title: 'Expiry Alerts (Next 60 Days)',
    description: 'Near-expiry batch safety monitoring for items expiring within 60 days.',
    zone: 'sidebar',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'inventory',
    badge: 'Expiry 60d',
  },

  // ─── GOLD BUSINESS (+8 Advanced = 18 Widgets) ───────────────────
  {
    id: 'fefo_expiry_status',
    title: 'FEFO Expiry Status Tracker',
    description: 'Real-time First-Expiry First-Out tracker highlighting medicines expiring in 30, 60, 90, and 180 days with batch metrics.',
    zone: 'main',
    minPlan: 'gold',
    defaultVisible: true,
    category: 'inventory',
    badge: 'FEFO Radar',
  },
  {
    id: 'therapeutic_category_mix',
    title: 'Therapeutic Drug Category Mix',
    description: 'Segmented stock mix chart, categorical sales breakdown, and margin percentages across drug classes.',
    zone: 'main',
    minPlan: 'gold',
    defaultVisible: true,
    category: 'inventory',
  },
  {
    id: 'weekly_revenue_trajectory',
    title: 'Weekly Revenue & Bill Trajectory',
    description: 'Daily counter performance across all active retail terminals with automatic peak day tagging.',
    zone: 'main',
    minPlan: 'gold',
    defaultVisible: true,
    category: 'finance',
  },
  {
    id: 'receivables_payables',
    title: 'Customer Receivables & Supplier Payables',
    description: 'Customer credit ledger balances, distributor supplier payables, and incoming purchase orders.',
    zone: 'main',
    minPlan: 'gold',
    defaultVisible: true,
    category: 'finance',
  },
  {
    id: 'missed_sales_demand',
    title: 'Missed Sales & Patient Demand Registry',
    description: 'Tracks out-of-stock inquiries, prescription shortages, and estimated lost revenue for smart ordering.',
    zone: 'main',
    minPlan: 'gold',
    defaultVisible: true,
    category: 'sales',
    badge: 'Demand Hub',
  },
  {
    id: 'udhar_aging_whatsapp',
    title: 'Customer Udhar Aging & WhatsApp Khata Radar',
    description: 'Credit aging buckets (0-30d, 31-60d, 90d+) with 1-click WhatsApp payment reminder statements.',
    zone: 'main',
    minPlan: 'gold',
    defaultVisible: true,
    category: 'finance',
    badge: 'Khata CRM',
  },
  {
    id: 'reorder_suggestions',
    title: 'Smart AI Reorder & Low-Stock Predictor',
    description: 'Sales velocity predictor forecasting stockout days and auto-generating purchase order quantities.',
    zone: 'main',
    minPlan: 'gold',
    defaultVisible: true,
    category: 'inventory',
    badge: 'AI Predictor',
  },

  // ─── PLATINUM ENTERPRISE (+6 VIP = 24 Widgets 100% Unlocked) ─────
  {
    id: 'pharmacy_erp_analytics_hub',
    title: 'Multi-Branch ERP Analytics Hub',
    description: 'Switchable multi-tab analytics engine with 7-Day Sales, Category Mix, Rush Hours, and Fast SKUs Matrix.',
    zone: 'main',
    minPlan: 'platinum',
    defaultVisible: true,
    category: 'kpi',
    badge: 'Enterprise Hub',
  },
  {
    id: 'hourly_rush_velocity',
    title: 'Hourly Doctor Rush Hours Velocity & Staffing',
    description: 'Identifies dual-peak doctor consultant rush hours with automated cashier staffing recommendations.',
    zone: 'main',
    minPlan: 'platinum',
    defaultVisible: true,
    category: 'operations',
    badge: 'Staff Optimizer',
  },
  {
    id: 'fast_skus_margin_matrix',
    title: 'Fast SKUs & Profit Margins Matrix',
    description: 'Real-time stock turnover rates, monthly consumption velocity, supplier profit margins, and remaining stock.',
    zone: 'main',
    minPlan: 'platinum',
    defaultVisible: true,
    category: 'sales',
  },
  {
    id: 'ai_expiry_loss_prevention',
    title: 'AI Expiry Loss Prevention & Supplier Debit Notes',
    description: 'Calculates claimable credit value, generates supplier debit return notes, and saves 100% wastage.',
    zone: 'main',
    minPlan: 'platinum',
    defaultVisible: true,
    category: 'inventory',
    badge: 'Zero Loss AI',
  },
  {
    id: 'anti_theft_audit_radar',
    title: 'Anti-Theft Void & Cashier Drawer Audit Radar',
    description: 'Tracks cancelled bills, deleted line items, manual price overrides, and cash drawer handover variances.',
    zone: 'main',
    minPlan: 'platinum',
    defaultVisible: true,
    category: 'security',
    badge: 'Anti-Theft',
  },
  {
    id: 'multi_branch_telemetry',
    title: 'Multi-Branch Real-Time Mesh Telemetry',
    description: 'Consolidated inter-branch transfer tracking, warehouse bin sync, and centralized chain analytics.',
    zone: 'main',
    minPlan: 'platinum',
    defaultVisible: true,
    category: 'operations',
    badge: 'Cloud Synapse',
  },

  // ─── ACTION, AI & HEALTH EXTENSIONS ──────────────────────────────
  {
    id: 'action_required',
    title: 'Action Required Alert Hub',
    description: 'Instant overview of expired stock, shortage alerts, pending supplier dues, and customer collections.',
    zone: 'main',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'operations',
    badge: 'Alerts',
  },
  {
    id: 'mbi_ai_recommendation',
    title: 'MBI AI Smart Recommendations',
    description: 'Predictive inventory reorder suggestions, stockout warnings, and revenue optimization insights.',
    zone: 'main',
    minPlan: 'gold',
    defaultVisible: true,
    category: 'inventory',
    badge: 'AI Engine',
  },
  {
    id: 'business_health',
    title: 'Business Health 4-Pillar Indicators',
    description: 'Visual sparklines tracking Sales Velocity, Gross Margins, Inventory Turnover, and Cash Reserves.',
    zone: 'main',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'finance',
    badge: 'Health',
  },
  {
    id: 'quick_actions_grid',
    title: 'Quick Actions 1-Click Launchpad',
    description: 'Instant counter shortcuts: + New Sale, + New Purchase, + Add Item, + Add Party, and Payments.',
    zone: 'main',
    minPlan: 'silver',
    defaultVisible: true,
    category: 'operations',
    badge: 'Launchpad',
  }
];

export const PRESET_LAYOUTS = {
  all_widgets: {
    id: 'all_widgets',
    label: '🌟 All Widgets View',
    description: 'Enables all widgets entitled under your current license tier',
    filter: () => true,
  },
  key_metrics: {
    id: 'key_metrics',
    label: '⚡ Key Metrics Focus',
    description: '6 essential executive KPIs and daily turnover widgets',
    filter: (w: DashboardWidgetConfig) => [
      'pharmacy_erp_kpi_metrics',
      'todays_profit',
      'recent_sales',
      'top_products',
      'low_stock_alerts',
      'fefo_expiry_status'
    ].includes(w.id),
  },
  financial_profit: {
    id: 'financial_profit',
    label: '💰 Financial & Profit Focus',
    description: '8 financial, bank, khata aging, and margin analysis widgets',
    filter: (w: DashboardWidgetConfig) => [
      'todays_profit',
      'sales_expenses',
      'sales_trend',
      'receivables_payables',
      'bank_accounts',
      'udhar_aging_whatsapp',
      'weekly_revenue_trajectory',
      'fast_skus_margin_matrix'
    ].includes(w.id),
  },
  inventory_expiry: {
    id: 'inventory_expiry',
    label: '📦 Inventory & Expiry Focus',
    description: '7 FEFO radar, batch alert, stock reorder, and valuation widgets',
    filter: (w: DashboardWidgetConfig) => [
      'fefo_expiry_status',
      'expiry_alerts',
      'low_stock_alerts',
      'reorder_suggestions',
      'stock_inventory',
      'therapeutic_category_mix',
      'ai_expiry_loss_prevention'
    ].includes(w.id),
  },
};

/**
 * Normalizes any plan string or dual-name format:
 * - Enterprise / Platinum Enterprise -> 'platinum'
 * - Business / Gold Business -> 'gold'
 * - Basic / Silver Basic -> 'silver'
 */
export function normalizeDashboardPlan(rawPlan?: string | null): 'silver' | 'gold' | 'platinum' {
  if (!rawPlan) return 'silver';
  const p = String(rawPlan).trim().toLowerCase();
  if (p.includes('enterprise') || p.includes('platinum') || p.includes('multi-branch') || p.includes('vip') || p.includes('premium') || p.includes('lifetime')) {
    return 'platinum';
  }
  if (p.includes('business') || p.includes('gold') || p.includes('pro')) {
    return 'gold';
  }
  if (p.includes('basic') || p.includes('silver') || p.includes('standard') || p.includes('trial') || p.includes('free')) {
    return 'silver';
  }
  return 'silver';
}

export function formatPlanDualName(rawPlan?: string | null): string {
  const norm = normalizeDashboardPlan(rawPlan);
  if (norm === 'platinum') return 'Platinum Enterprise';
  if (norm === 'gold') return 'Gold Business';
  return 'Silver Basic';
}

export function isWidgetAllowedInPlan(widget: DashboardWidgetConfig, userPlan: string = 'silver'): boolean {
  const normPlan = normalizeDashboardPlan(userPlan);
  const currentRank = PLAN_ORDER[normPlan] || 1;
  const reqNorm = normalizeDashboardPlan(widget.minPlan);
  const reqRank = PLAN_ORDER[reqNorm] || 1;
  return currentRank >= reqRank;
}

export function isWidgetAllowedWithFeatures(
  widget: DashboardWidgetConfig,
  userPlan: string = 'silver',
  customFeatures?: Record<string, boolean> | null
): boolean {
  // If customFeatures not provided, load from active tenant localStorage
  let features = customFeatures;
  if (!features && typeof localStorage !== 'undefined') {
    const tid = localStorage.getItem('mbi_active_tenant_id') || localStorage.getItem('mbi_active_business_id');
    if (tid) {
      try {
        const raw = localStorage.getItem(`mbi_tenant_features_${tid}`) || localStorage.getItem(`mbi_tenant_overrides_${tid}`);
        if (raw) features = JSON.parse(raw);
      } catch {}
    }
  }

  // Check explicit granular feature switchboard override if defined
  if (features) {
    if (features['all_24_dashboard_widgets'] === true || features['all_dashboard_widgets'] === true) return true;
    if (features[widget.id] === true) return true;
    if (features[`widget_${widget.id}`] === true) return true;
    if (features[widget.id] === false) return false;
    if (features[`widget_${widget.id}`] === false) return false;

    // Specific mapping to 35 switchboard modules
    if (widget.id === 'pharmacy_erp_kpi_metrics' && (features['dashboard_financial_cards'] === true || features['financial_cash_flow_cards'] === true)) return true;
    if (widget.id === 'pharmacy_erp_kpi_metrics' && (features['dashboard_financial_cards'] === false || features['financial_cash_flow_cards'] === false)) return false;

    if ((widget.id === 'sales_trend' || widget.id === 'weekly_revenue_trajectory' || widget.id === 'hourly_rush_velocity') && (features['dashboard_sales_trend_chart'] === true || features['sales_trend_chart'] === true)) return true;
    if ((widget.id === 'sales_trend' || widget.id === 'weekly_revenue_trajectory' || widget.id === 'hourly_rush_velocity') && (features['dashboard_sales_trend_chart'] === false || features['sales_trend_chart'] === false)) return false;

    if ((widget.id === 'top_products' || widget.id === 'fast_skus_margin_matrix') && (features['dashboard_top_products'] === true || features['top_products_analytics'] === true || features['widget_top_selling_medicines'] === true)) return true;
    if ((widget.id === 'top_products' || widget.id === 'fast_skus_margin_matrix') && (features['dashboard_top_products'] === false || features['top_products_analytics'] === false || features['widget_top_selling_medicines'] === false)) return false;

    if (widget.id === 'expiry_alerts' && (features['dashboard_expiry_alerts'] === true || features['widget_near_expiry_alert'] === true)) return true;
    if (widget.id === 'expiry_alerts' && (features['dashboard_expiry_alerts'] === false || features['widget_near_expiry_alert'] === false)) return false;

    if (widget.id === 'fefo_expiry_status' && (features['fefo_expiry_management'] === true || features['fefo_radar_near_expiry'] === true)) {
      return normalizeDashboardPlan(userPlan) !== 'silver';
    }
    if (widget.id === 'fefo_expiry_status' && (features['fefo_expiry_management'] === false || features['fefo_radar_near_expiry'] === false)) return false;

    if (widget.id === 'ai_expiry_loss_prevention' && (features['ai_expiry_loss_prevention'] === true || features['ai_expiry_loss'] === true)) {
      return normalizeDashboardPlan(userPlan) === 'platinum';
    }
    if (widget.id === 'ai_expiry_loss_prevention' && (features['ai_expiry_loss_prevention'] === false || features['ai_expiry_loss'] === false)) return false;

    if ((widget.id === 'shortage_registry' || widget.id === 'missed_sales_demand' || widget.id === 'action_required') && (features['dashboard_shortage_matrix'] === true || features['shortage_registry'] === true || features['shortage_matrix'] === true)) return true;
    if ((widget.id === 'shortage_registry' || widget.id === 'missed_sales_demand' || widget.id === 'action_required') && (features['dashboard_shortage_matrix'] === false || features['shortage_registry'] === false || features['shortage_matrix'] === false)) return false;

    if ((widget.id === 'receivables_payables' || widget.id === 'udhar_aging_whatsapp') && (features['dashboard_khata_receivables'] === true || features['supplier_customer_khata'] === true || features['khata_balance_board'] === true)) return true;
    if ((widget.id === 'receivables_payables' || widget.id === 'udhar_aging_whatsapp') && (features['dashboard_khata_receivables'] === false || features['supplier_customer_khata'] === false || features['khata_balance_board'] === false)) return false;

    if ((widget.id === 'therapeutic_category_mix' || widget.id === 'business_health') && (features['category_profit_heatmap'] === true || features['dashboard_live_margin_monitor'] === true)) return true;
    if ((widget.id === 'therapeutic_category_mix' || widget.id === 'business_health') && (features['category_profit_heatmap'] === false || features['dashboard_live_margin_monitor'] === false)) return false;

    if (widget.id === 'reorder_suggestions' && (features['demand_forecast'] === true || features['inventory_low_stock_auto_order'] === true)) return true;
    if (widget.id === 'reorder_suggestions' && (features['demand_forecast'] === false || features['inventory_low_stock_auto_order'] === false)) return false;

    if ((widget.id === 'ai_recommendations' || widget.id === 'mbi_ai_recommendation') && (features['ai_assistant'] === true || features['clinical_drug_interaction'] === true)) return true;
    if ((widget.id === 'ai_recommendations' || widget.id === 'mbi_ai_recommendation') && (features['ai_assistant'] === false || features['clinical_drug_interaction'] === false)) return false;

    if (widget.id === 'anti_theft_audit_radar' && (features['full_audit_trail'] === true || features['anti_theft_radar'] === true)) return true;
    if (widget.id === 'anti_theft_audit_radar' && (features['full_audit_trail'] === false || features['anti_theft_radar'] === false)) return false;

    if (widget.id === 'todays_profit' && (features['widget_net_profit_margin'] === true || features['live_profit_margin'] === true)) return true;
    if (widget.id === 'todays_profit' && (features['widget_net_profit_margin'] === false || features['live_profit_margin'] === false)) return false;

    if (widget.id === 'recent_sales' && features['widget_recent_invoices_feed'] === true) return true;
    if (widget.id === 'recent_sales' && features['widget_recent_invoices_feed'] === false) return false;

    if (widget.id === 'low_stock_alerts' && features['widget_low_stock_alert'] === true) return true;
    if (widget.id === 'low_stock_alerts' && features['widget_low_stock_alert'] === false) return false;
  }
  return isWidgetAllowedInPlan(widget, userPlan);
}

export function getWidgetsForPlan(
  userPlan: string = 'silver',
  customFeatures?: Record<string, boolean> | null
): DashboardWidgetConfig[] {
  return DASHBOARD_WIDGETS_CONFIG.filter(w => isWidgetAllowedWithFeatures(w, userPlan, customFeatures));
}

