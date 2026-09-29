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
 * Fetch tenant-specific inventory and sales summary safely from MariaDB (WHERE tenant_id = ?)
 */
export async function getTenantStoreMetrics(tenantId: string) {
  if (!tenantId || tenantId === 'global' || tenantId === 'default') {
    return {
      todaySalesCount: 0,
      todayRevenue: 0,
      lowStockCount: 0,
      nearExpiryCount: 0
    };
  }

  try {
    const pool = getMariaDbPool();
    const today = new Date().toISOString().slice(0, 10);
    const ninetyDaysAhead = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

    // 1. Today's Invoices
    const [invRows]: any = await pool.query(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(grand_total), 0) as total FROM mbi_invoices WHERE tenant_id = ? AND date LIKE ? AND is_voided = 0`,
      [tenantId, `${today}%`]
    );

    // 2. Low Stock Count
    const [stockRows]: any = await pool.query(
      `SELECT COUNT(DISTINCT m.id) as cnt FROM mbi_medicines m 
       LEFT JOIN mbi_inventory_batches b ON m.id = b.medicine_id AND b.tenant_id = m.tenant_id 
       WHERE m.tenant_id = ? 
       GROUP BY m.id 
       HAVING COALESCE(SUM(b.current_stock_quantity), 0) <= m.min_stock_level`,
      [tenantId]
    );

    // 3. FEFO Expiry < 90 Days
    const [expRows]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM mbi_inventory_batches 
       WHERE tenant_id = ? AND expiry_date <= ? AND current_stock_quantity > 0`,
      [tenantId, ninetyDaysAhead]
    );

    return {
      todaySalesCount: Number(invRows[0]?.cnt || 0),
      todayRevenue: Number(invRows[0]?.total || 0),
      lowStockCount: Array.isArray(stockRows) ? stockRows.length : 0,
      nearExpiryCount: Number(expRows[0]?.cnt || 0)
    };
  } catch (err: any) {
    console.warn('[AI DATA ENGINE METRICS FETCH WARN]', err?.message);
    return {
      todaySalesCount: 0,
      todayRevenue: 0,
      lowStockCount: 0,
      nearExpiryCount: 0
    };
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
