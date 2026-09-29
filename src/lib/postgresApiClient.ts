/**
 * MBI INVENTRA — POSTGRESQL-BACKED NATIVE REST API CLIENT & PROXY SERVICE
 * Provides unified authentication, tenant scoping, and CRUD operations for all entities.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
  operationId?: string;
  serverTimestamp?: number;
}

export class PostgresApiClient {
  private static instance: PostgresApiClient;
  private baseUrl: string = '/api';

  private constructor() {}

  public static getInstance(): PostgresApiClient {
    if (!PostgresApiClient.instance) {
      PostgresApiClient.instance = new PostgresApiClient();
    }
    return PostgresApiClient.instance;
  }

  private getAuthHeaders(): HeadersInit {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('mbi_session_jwt_token') : null;
    const activeTenant = typeof localStorage !== 'undefined' ? localStorage.getItem('mbi_active_business_id') : null;

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeTenant ? { 'x-tenant-id': activeTenant } : {})
    };
  }

  /**
   * Universal Sync Operation (CREATE, UPDATE, DELETE) to PostgreSQL backend
   */
  public async syncOperation<T = any>(
    entityType: string,
    entityId: string,
    operationType: 'CREATE' | 'UPDATE' | 'DELETE',
    payload: any,
    tenantId?: string,
    firmId?: string
  ): Promise<ApiResponse<T>> {
    try {
      const activeTenant = tenantId || (typeof localStorage !== 'undefined' ? localStorage.getItem('mbi_active_business_id') || 'tenant-demo-01' : 'tenant-demo-01');
      const activeFirm = firmId || 'firm-main';
      const operationId = `op_${activeTenant}_${activeFirm}_${entityType}_${entityId}_${Date.now()}`;

      const res = await fetch(`${this.baseUrl}/tenant/sync-operation`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          operationId,
          tenantId: activeTenant,
          firmId: activeFirm,
          entityType,
          entityId,
          operationType,
          payload,
          timestamp: new Date().toISOString()
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errJson.error || `HTTP ${res.status}: ${res.statusText}`
        };
      }

      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network communication error'
      };
    }
  }

  /**
   * Query Tenant Info & Schema Status
   */
  public async getTenantInfo(): Promise<ApiResponse<any>> {
    try {
      const res = await fetch(`${this.baseUrl}/tenant/info`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to fetch tenant metadata' };
    }
  }

  /**
   * Authenticate User with Email/Password & receive cryptographically signed JWT
   */
  public async login(email: string, password: string, tenantId?: string, role?: string): Promise<ApiResponse<any>> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenantId, role })
      });

      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('mbi_session_jwt_token', data.token);
        localStorage.setItem('mbi_native_active_session', JSON.stringify(data.user));
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Authentication error' };
    }
  }

  /**
   * Master Admin Login
   */
  public async masterLogin(pinCode: string): Promise<ApiResponse<any>> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/master-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-master-pin': pinCode
        }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Master login failed' };
    }
  }
}

export const postgresApiClient = PostgresApiClient.getInstance();
