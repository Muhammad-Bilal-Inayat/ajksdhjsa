export interface CatalogMedicineItem {
  id: string;
  name: string;
  genericFormula?: string;
  company?: string;
  category: string;
  dosageForm?: string;
  strength?: string;
  barcode?: string;
  minStockLevel?: number;
  packSize?: number;
}

export interface CatalogMetadata {
  totalCatalogItems: number;
  totalCompanies: number;
  totalCategories: number;
  companies: { name: string; count: number }[];
  categories: { name: string; count: number }[];
  tenants: { id: string; name: string; city: string; plan: string }[];
}

export interface CatalogStats {
  totalGlobalMedicines: number;
  totalCompanies: number;
  totalCategories: number;
}

export interface AssignBatchPayload {
  targetTenantId: string;
  targetTenantName?: string;
  mode: 'company' | 'category' | 'selected' | 'all';
  company?: string;
  category?: string;
  medicineIds?: string[];
}

export interface RevokePayload {
  tenantId: string;
  mode: 'single' | 'company' | 'category' | 'wipe_all';
  company?: string;
  category?: string;
  medicineId?: string;
}

export interface TenantMedicineStats {
  tenantId: string;
  totalAssignedMedicines: number;
  companiesBreakdown: { company: string; count: number }[];
  categoriesBreakdown: { category: string; count: number }[];
}

export interface SingleMedicinePayload {
  name: string;
  generic_salt?: string;
  company?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  barcode?: string;
  pack_size?: number;
  min_stock_level?: number;
  is_narcotic?: number;
  is_prescription_required?: number;
}

export const adminMedicineService = {
  /**
   * Dynamic stats direct from MariaDB
   */
  async fetchCatalogStats(): Promise<CatalogStats> {
    const res = await fetch('/api/admin/medicines/stats');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch catalog stats');
    }
    return res.json();
  },

  /**
   * Fetch paginated master catalog chunk (50 items default)
   */
  async fetchCatalogPage(params: {
    page?: number;
    limit?: number;
    search?: string;
    company?: string;
    category?: string;
    tenantId?: string;
  }): Promise<{
    items: CatalogMedicineItem[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.company && params.company !== 'ALL') query.set('company', params.company);
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.tenantId) query.set('tenantId', params.tenantId);

    const res = await fetch(`/api/admin/medicines/catalog?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load catalog page');
    }
    return res.json();
  },

  /**
   * Fetch companies, categories, and pharmacy store list metadata
   */
  async fetchCatalogMetadata(): Promise<CatalogMetadata> {
    const res = await fetch('/api/admin/medicines/metadata');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load catalog metadata');
    }
    return res.json();
  },

  /**
   * 1-Click Initial Seeder: Seeds 14,322 medicines into MariaDB in 1000-item transactions
   */
  async seed14kMedicines(): Promise<{
    success: boolean;
    seededCount: number;
    message: string;
  }> {
    const res = await fetch('/api/admin/medicines/seed-14k', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to seed 14k medicines');
    }
    return data;
  },

  /**
   * Manually create a single master medicine
   */
  async createSingleMedicine(payload: SingleMedicinePayload): Promise<{
    success: boolean;
    medicine: any;
    message: string;
  }> {
    const res = await fetch('/api/admin/medicines/create-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create medicine');
    }
    return data;
  },

  /**
   * Upload CSV or array of parsed records via streaming chunk parser
   */
  async uploadMedicinesCsv(payload: { csvData?: string; records?: any[] }): Promise<{
    success: boolean;
    totalProcessed: number;
    message: string;
  }> {
    const res = await fetch('/api/admin/medicines/upload-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload CSV');
    }
    return data;
  },

  /**
   * Bulk assign medicines by company, category, or custom selection with deduplication
   */
  async assignMedicinesBatch(payload: AssignBatchPayload): Promise<{
    success: boolean;
    assignedCount: number;
    message: string;
  }> {
    const res = await fetch('/api/admin/medicines/assign-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to assign medicines');
    }
    return data;
  },

  /**
   * Revoke single item, company, category or wipe tenant catalog
   */
  async revokeMedicines(payload: RevokePayload): Promise<{
    success: boolean;
    revokedCount: number;
    message: string;
  }> {
    const res = await fetch(`/api/admin/tenants/${payload.tenantId}/medicines/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to revoke medicines');
    }
    return data;
  },

  /**
   * Fetch tenant assigned medicines breakdown
   */
  async fetchTenantMedicineStats(tenantId: string): Promise<TenantMedicineStats> {
    const res = await fetch(`/api/admin/tenants/${tenantId}/medicines/stats`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load tenant stats');
    }
    return res.json();
  }
};
