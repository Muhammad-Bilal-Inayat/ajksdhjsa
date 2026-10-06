import { getMariaDbPool } from '../db/mariaClient';

export interface PharmacyAiContext {
  tenantId: string;
  userPlan: string;
  storeName?: string;
  userName?: string;
}

// Common Pakistani generic formula lookup dictionary for instant zero-latency intelligence
export const PAKISTANI_MEDICINE_GENERICS: Record<string, { generic: string; uses: string; alternatives: string[] }> = {
  'augmentin': {
    generic: 'Co-Amoxiclav (Amoxicillin + Clavulanic Acid)',
    uses: 'Broad-spectrum antibiotic for respiratory tract, ENT, dental, and skin infections.',
    alternatives: ['Curam', 'Klavox', 'Amoclav', 'Moxclav', 'Augmax']
  },
  'panadol': {
    generic: 'Paracetamol (Acetaminophen)',
    uses: 'Analgesic & antipyretic for pain relief, headaches, and fever management.',
    alternatives: ['Calpol', 'Disprol', 'Febrol', 'Paramol', 'Tylenol']
  },
  'brufen': {
    generic: 'Ibuprofen',
    uses: 'NSAID for pain, inflammation, swelling, and musculoskeletal pain.',
    alternatives: ['Profen', 'Advil', 'Motrin', 'Ibex']
  },
  'risek': {
    generic: 'Omeprazole',
    uses: 'Proton Pump Inhibitor (PPI) for gastric acidity, GERD, and peptic ulcers.',
    alternatives: ['Omega', 'Losec', 'Omepra', 'Procept']
  },
  'flagyl': {
    generic: 'Metronidazole',
    uses: 'Antibacterial & antiprotozoal for amoebiasis, giardiasis, and anaerobic infections.',
    alternatives: ['Metrozine', 'Entamizole (Combo)', 'Nidazole']
  },
  'arinac': {
    generic: 'Ibuprofen + Pseudoephedrine Hydrochloride',
    uses: 'Decongestant and pain reliever for cold, nasal congestion, and sinus pain.',
    alternatives: ['Sinutab', 'Fludrex', 'Actifed (Cold)']
  },
  'gavilac': {
    generic: 'Lactulose',
    uses: 'Osmotic laxative for chronic constipation and hepatic encephalopathy.',
    alternatives: ['Duphalac', 'Lilac', 'Lactul']
  },
  'flynex': {
    generic: 'Fexofenadine Hydrochloride',
    uses: 'Non-sedating antihistamine for seasonal allergic rhinitis and urticaria.',
    alternatives: ['Telfast', 'Fexit', 'Aller-F']
  }
};

/**
 * Checks if a query is attempting to exploit or breach internal server credentials
 */
export function isSecurityViolationQuery(query: string): boolean {
  const lower = query.toLowerCase();
  const forbiddenPatterns = [
    'root password',
    'database password',
    'mariadb password',
    'mbi72dn password',
    'server master pin',
    'bypass hwid',
    'crack license',
    'show env',
    '.env',
    'api_key',
    'secret_key',
    'exec(',
    'eval(',
    'drop database',
    'drop table',
    'truncate table',
    '/api/master/emergency-lock'
  ];

  return forbiddenPatterns.some(p => lower.includes(p));
}

/**
 * Fetch tenant-specific inventory, parties, ledgers, and sales summary safely with strict physical isolation
 */
export async function getTenantStoreMetrics(tenantId: string) {
  const snapshot = await getTenantLiveSnapshot(tenantId);
  return {
    todaySalesCount: snapshot.todaySalesCount,
    todayRevenue: snapshot.todayRevenue,
    lowStockCount: snapshot.lowStockCount,
    nearExpiryCount: snapshot.nearExpiryCount
  };
}

export interface TenantLiveSnapshot {
  tenantId: string;
  todaySalesCount: number;
  todayRevenue: number;
  totalSalesCount: number;
  totalSalesRevenue: number;
  totalCustomers: number;
  totalSuppliers: number;
  customerReceivableTotal: number;
  supplierPayableTotal: number;
  topCustomersWithBalance: Array<{ name: string; balance: number; phone?: string }>;
  topSuppliersWithBalance: Array<{ name: string; balance: number; phone?: string }>;
  totalMedicines: number;
  lowStockCount: number;
  lowStockItems: Array<{ name: string; stock_qty: number; min_stock: number }>;
  nearExpiryCount: number;
  nearExpiryItems: Array<{ name: string; batch?: string; expiry: string; qty: number }>;
  totalExpenses: number;
  todayExpenses: number;
}

/**
 * STRICT TENANT-ISOLATED LIVE DATA EXTRACTOR
 * Reads strictly from the tenant's private SQLite vault (data/tenants/tenant_[tenantId].sqlite)
 * with zero-cross-tenant leakage.
 */
export async function getTenantLiveSnapshot(tenantId: string): Promise<TenantLiveSnapshot> {
  const defaultSnapshot: TenantLiveSnapshot = {
    tenantId: tenantId || 'default',
    todaySalesCount: 0,
    todayRevenue: 0,
    totalSalesCount: 0,
    totalSalesRevenue: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    customerReceivableTotal: 0,
    supplierPayableTotal: 0,
    topCustomersWithBalance: [],
    topSuppliersWithBalance: [],
    totalMedicines: 0,
    lowStockCount: 0,
    lowStockItems: [],
    nearExpiryCount: 0,
    nearExpiryItems: [],
    totalExpenses: 0,
    todayExpenses: 0
  };

  if (!tenantId || tenantId === 'global' || tenantId === 'default') {
    return defaultSnapshot;
  }

  const today = new Date().toISOString().slice(0, 10);
  const ninetyDaysAhead = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  // 1. Primary Method: Query Tenant SQLite Vault (0ms latency, 100% physically isolated)
  try {
    const { getTenantVault } = await import('../db/sqliteVaultManager');
    const tenantDb = getTenantVault(tenantId);

    // Sales & Invoices
    try {
      const invStats: any = tenantDb.prepare(`
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(grand_total), 0) as total_revenue,
          COUNT(CASE WHEN created_at LIKE ? OR date LIKE ? THEN 1 END) as today_count,
          COALESCE(SUM(CASE WHEN created_at LIKE ? OR date LIKE ? THEN grand_total ELSE 0 END), 0) as today_revenue
        FROM invoices
      `).get(`${today}%`, `${today}%`, `${today}%`, `${today}%`);

      if (invStats) {
        defaultSnapshot.totalSalesCount = Number(invStats.total_count || 0);
        defaultSnapshot.totalSalesRevenue = Number(invStats.total_revenue || 0);
        defaultSnapshot.todaySalesCount = Number(invStats.today_count || 0);
        defaultSnapshot.todayRevenue = Number(invStats.today_revenue || 0);
      }
    } catch {}

    // Parties & Ledgers (Customers & Suppliers)
    try {
      const partyStats: any = tenantDb.prepare(`
        SELECT 
          COUNT(CASE WHEN type = 'Customer' OR type = 'customer' THEN 1 END) as total_cust,
          COUNT(CASE WHEN type = 'Supplier' OR type = 'supplier' THEN 1 END) as total_supp,
          COALESCE(SUM(CASE WHEN (type = 'Customer' OR type = 'customer') AND balance > 0 THEN balance ELSE 0 END), 0) as cust_receivable,
          COALESCE(SUM(CASE WHEN (type = 'Supplier' OR type = 'supplier') AND balance > 0 THEN balance ELSE 0 END), 0) as supp_payable
        FROM parties
      `).get();

      if (partyStats) {
        defaultSnapshot.totalCustomers = Number(partyStats.total_cust || 0);
        defaultSnapshot.totalSuppliers = Number(partyStats.total_supp || 0);
        defaultSnapshot.customerReceivableTotal = Number(partyStats.cust_receivable || 0);
        defaultSnapshot.supplierPayableTotal = Number(partyStats.supp_payable || 0);
      }

      // Top 5 Customers with Outstanding Balance
      const topCusts: any[] = tenantDb.prepare(`
        SELECT name, balance, phone 
        FROM parties 
        WHERE (type = 'Customer' OR type = 'customer') AND balance > 0 
        ORDER BY balance DESC 
        LIMIT 5
      `).all() as any[];
      if (Array.isArray(topCusts)) {
        defaultSnapshot.topCustomersWithBalance = topCusts.map(c => ({
          name: c.name || 'Customer',
          balance: Number(c.balance || 0),
          phone: c.phone || ''
        }));
      }

      // Top 5 Suppliers with Outstanding Payables
      const topSupps: any[] = tenantDb.prepare(`
        SELECT name, balance, phone 
        FROM parties 
        WHERE (type = 'Supplier' OR type = 'supplier') AND balance > 0 
        ORDER BY balance DESC 
        LIMIT 5
      `).all() as any[];
      if (Array.isArray(topSupps)) {
        defaultSnapshot.topSuppliersWithBalance = topSupps.map(s => ({
          name: s.name || 'Supplier',
          balance: Number(s.balance || 0),
          phone: s.phone || ''
        }));
      }
    } catch {}

    // Inventory & Medicines
    try {
      const medStats: any = tenantDb.prepare(`
        SELECT 
          COUNT(*) as total_meds,
          COUNT(CASE WHEN stock_qty <= min_stock THEN 1 END) as low_stock_count,
          COUNT(CASE WHEN fefo_expiry_date IS NOT NULL AND fefo_expiry_date != '' AND fefo_expiry_date <= ? AND stock_qty > 0 THEN 1 END) as near_expiry_count
        FROM medicines
      `).get(ninetyDaysAhead);

      if (medStats) {
        defaultSnapshot.totalMedicines = Number(medStats.total_meds || 0);
        defaultSnapshot.lowStockCount = Number(medStats.low_stock_count || 0);
        defaultSnapshot.nearExpiryCount = Number(medStats.near_expiry_count || 0);
      }

      // Top 5 Low Stock Items
      const lowItems: any[] = tenantDb.prepare(`
        SELECT name, stock_qty, min_stock 
        FROM medicines 
        WHERE stock_qty <= min_stock 
        ORDER BY stock_qty ASC 
        LIMIT 5
      `).all() as any[];
      if (Array.isArray(lowItems)) {
        defaultSnapshot.lowStockItems = lowItems.map(i => ({
          name: i.name,
          stock_qty: Number(i.stock_qty || 0),
          min_stock: Number(i.min_stock || 5)
        }));
      }

      // Top 5 Near Expiry Items
      const expItems: any[] = tenantDb.prepare(`
        SELECT name, batch_number, fefo_expiry_date, stock_qty 
        FROM medicines 
        WHERE fefo_expiry_date IS NOT NULL AND fefo_expiry_date != '' AND fefo_expiry_date <= ? AND stock_qty > 0 
        ORDER BY fefo_expiry_date ASC 
        LIMIT 5
      `).all(ninetyDaysAhead) as any[];
      if (Array.isArray(expItems)) {
        defaultSnapshot.nearExpiryItems = expItems.map(e => ({
          name: e.name,
          batch: e.batch_number || '',
          expiry: e.fefo_expiry_date,
          qty: Number(e.stock_qty || 0)
        }));
      }
    } catch {}

    // Expenses
    try {
      const expStats: any = tenantDb.prepare(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_exp,
          COALESCE(SUM(CASE WHEN created_at LIKE ? OR date LIKE ? THEN amount ELSE 0 END), 0) as today_exp
        FROM expenses
      `).get(`${today}%`, `${today}%`);
      if (expStats) {
        defaultSnapshot.totalExpenses = Number(expStats.total_exp || 0);
        defaultSnapshot.todayExpenses = Number(expStats.today_exp || 0);
      }
    } catch {}

    return defaultSnapshot;
  } catch (sqliteErr: any) {
    // Fallback to MariaDB with WHERE tenant_id = ?
    try {
      const pool = getMariaDbPool();
      const [invRows]: any = await pool.query(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(grand_total), 0) as total FROM mbi_invoices WHERE tenant_id = ? AND is_voided = 0`,
        [tenantId]
      );
      if (invRows && invRows[0]) {
        defaultSnapshot.totalSalesCount = Number(invRows[0].cnt || 0);
        defaultSnapshot.totalSalesRevenue = Number(invRows[0].total || 0);
      }
    } catch {}
    return defaultSnapshot;
  }
}

/**
 * Format intelligent response for pharmacy generic alternative queries
 */
export function matchGenericAlternative(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [brand, info] of Object.entries(PAKISTANI_MEDICINE_GENERICS)) {
    if (lower.includes(brand)) {
      return `💊 **Generic Formula & Alternatives for ${brand.toUpperCase()}**:\n- **Generic Salt:** ${info.generic}\n- **Clinical Indication:** ${info.uses}\n- **Recommended Substitutions in Pakistan:** ${info.alternatives.join(', ')}\n\n*Tip: In POS Billing, press 'F2' to search by generic formula when specific brand is out of stock.*`;
    }
  }
  return null;
}
