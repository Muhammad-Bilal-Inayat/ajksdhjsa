/**
 * SQLite Vault Bridge & Legacy Connector Stub
 * MBI INVENTRA — 100% Native SQLite Vault Engine
 * 
 * MariaDB has been fully replaced by Tenant-Isolated SQLite Vaults
 * (server/data/master/master_hub.sqlite and server/data/tenants/tenant_[tenant_id].sqlite).
 * This module provides clean backwards-compatible stubs with zero external dependencies.
 */

export interface MariaDbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

export function getDbConfig(): MariaDbConfig {
  return {
    host: 'localhost',
    port: 3306,
    user: 'sqlite_vault',
    password: '',
    database: 'sqlite_vault_master',
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
  };
}

export function isMariaDbConnected(): boolean {
  return false;
}

export async function isMariaDbAvailable(): Promise<boolean> {
  return false;
}

const dummyPool: any = {
  query: async () => [[]],
  execute: async () => [[]],
  getConnection: async () => ({
    release: () => { },
    query: async () => [[]],
    execute: async () => [[]],
    beginTransaction: async () => { },
    commit: async () => { },
    rollback: async () => { },
  }),
  end: async () => { },
  on: () => { },
};

export function getMariaDbPool(): any {
  return dummyPool;
}

export async function testMariaDbConnection(): Promise<{ success: boolean; connected: boolean; message: string; pingMs?: number; host?: string; port?: number }> {
  return {
    success: true,
    connected: false,
    pingMs: 0,
    host: 'sqlite_vault',
    port: 0,
    message: 'System running on 100% Tenant-Isolated Native SQLite Vault Engine (WAL Mode). MariaDB is disabled.'
  };
}

export async function initializeMariaDbSchema(): Promise<boolean> {
  return true;
}

export async function syncRecordToMariaDb(_entityType: string, _payload: any, _tenantId?: string): Promise<boolean> {
  // MariaDB sync disabled — data is safely stored in isolated Tenant SQLite Vaults
  return true;
}

export async function getMariaDbTableStats(): Promise<{ isConnected: boolean; tables: any[] }> {
  return {
    isConnected: false,
    tables: []
  };
}

export async function saveAiChatLogToMariaDb(_log: any): Promise<void> {
  // Handled directly by Master SQLite Vault
}

export async function getAiChatHistoryFromMariaDb(_optionsOrTenantId?: any, _userId?: string, _limit = 50): Promise<any[]> {
  return [];
}
