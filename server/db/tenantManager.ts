import fs from 'fs';
import path from 'path';

/**
 * Sanitizes tenantId to create a safe PostgreSQL schema name
 * Example: 'tenant-demo-01' -> 'tenant_tenant_demo_01'
 */
export function sanitizeSchemaName(tenantId: string): string {
  const cleanId = tenantId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return `tenant_${cleanId}`;
}

/**
 * Reads the tenant template SQL migration file
 */
export function getTenantTemplateSql(): string {
  const templatePath = path.resolve(process.cwd(), 'server', 'db', 'migrations', '002_tenant_template_schema.sql');
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf-8');
  }
  return '';
}

/**
 * Reads the master schema SQL migration file
 */
export function getMasterSchemaSql(): string {
  const masterPath = path.resolve(process.cwd(), 'server', 'db', 'migrations', '001_master_schema.sql');
  if (fs.existsSync(masterPath)) {
    return fs.readFileSync(masterPath, 'utf-8');
  }
  return '';
}

/**
 * Generates SQL script to provision or upgrade an isolated tenant schema
 */
export function generateTenantProvisioningScript(tenantId: string): string {
  const schemaName = sanitizeSchemaName(tenantId);
  const templateSql = getTenantTemplateSql();

  return `
-- ==========================================================
-- PROVISION ISOLATED TENANT SCHEMA: ${schemaName}
-- ==========================================================
CREATE SCHEMA IF NOT EXISTS ${schemaName};
SET search_path TO ${schemaName}, public;

${templateSql}

-- Reset search path to public
SET search_path TO public;
`;
}
