-- ==============================================================================
-- MBI INVENTRA — POSTGRESQL MASTER SCHEMA DDL MIGRATION (001_master_schema.sql)
-- Multi-Tenant Control, Authorization, Licenses, Devices, Plans & Audit Trails
-- ==============================================================================

-- 1. Create Master Schema
CREATE SCHEMA IF NOT EXISTS master;

-- 2. Master Plans (SaaS Tier Definitions)
CREATE TABLE IF NOT EXISTS master.plans (
    id VARCHAR(64) PRIMARY KEY, -- 'Basic', 'Business', 'Premium'
    name VARCHAR(100) NOT NULL,
    monthly_price_pkr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    annual_price_pkr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_users INT NOT NULL DEFAULT 5,
    max_firms INT NOT NULL DEFAULT 1,
    max_devices INT NOT NULL DEFAULT 3,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Master Tenants (Isolated Companies / Pharmacy Businesses)
CREATE TABLE IF NOT EXISTS master.tenants (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'tenant-demo-01'
    organization_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL, -- Pharmacy / Store Name
    legal_name VARCHAR(255),
    owner_name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(64) NOT NULL,
    city VARCHAR(100),
    address TEXT,
    plan_id VARCHAR(64) NOT NULL REFERENCES master.plans(id) ON UPDATE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Expired', 'Trial', 'Pending')),
    schema_name VARCHAR(64) NOT NULL UNIQUE, -- e.g. 'tenant_tenant_demo_01'
    max_firms INT NOT NULL DEFAULT 1,
    max_users INT NOT NULL DEFAULT 5,
    max_devices INT NOT NULL DEFAULT 3,
    storage_limit_mb INT NOT NULL DEFAULT 500,
    storage_used_mb NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(12, 2) DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    amount_due NUMERIC(12, 2) DEFAULT 0.00,
    sale_status VARCHAR(32) DEFAULT 'Paid' CHECK (sale_status IN ('Paid', 'Partial', 'Pending', 'Complimentary / Trial')),
    payment_method VARCHAR(64) DEFAULT 'Bank Transfer',
    sale_date TIMESTAMPTZ DEFAULT NOW(),
    trial_start_date TIMESTAMPTZ,
    trial_expiry_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenants_status ON master.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_email ON master.tenants(owner_email);
CREATE INDEX IF NOT EXISTS idx_tenants_schema_name ON master.tenants(schema_name);

-- 4. Master Firms (Multi-Branch / Multi-Firm support per Tenant)
CREATE TABLE IF NOT EXISTS master.firms (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES master.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32),
    phone VARCHAR(64),
    email VARCHAR(255),
    address TEXT,
    license_number VARCHAR(100),
    tax_ntn_strn VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firms_tenant_id ON master.firms(tenant_id);

-- 5. Master Users (Company Staff Accounts & Role-Based Access)
CREATE TABLE IF NOT EXISTS master.users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES master.tenants(id) ON DELETE CASCADE,
    firm_id VARCHAR(64) REFERENCES master.firms(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    role VARCHAR(64) NOT NULL DEFAULT 'Cashier',
    status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Disabled', 'PendingApproval', 'Suspended')),
    pin_code VARCHAR(10),
    is_primary_admin BOOLEAN NOT NULL DEFAULT FALSE,
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    feature_overrides JSONB DEFAULT '{}'::jsonb,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_user_email UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON master.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON master.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON master.users(role);

-- 6. Master Licenses (Authoritative Cryptographic License Engine)
CREATE TABLE IF NOT EXISTS master.licenses (
    id VARCHAR(64) PRIMARY KEY,
    license_key VARCHAR(128) NOT NULL UNIQUE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES master.tenants(id) ON DELETE CASCADE,
    plan_id VARCHAR(64) NOT NULL REFERENCES master.plans(id),
    status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Expired', 'Trial', 'Revoked')),
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMPTZ NOT NULL,
    max_devices INT NOT NULL DEFAULT 3,
    max_users INT NOT NULL DEFAULT 5,
    max_firms INT NOT NULL DEFAULT 1,
    is_lifetime BOOLEAN NOT NULL DEFAULT FALSE,
    hardware_locked BOOLEAN NOT NULL DEFAULT TRUE,
    anti_tamper_signature TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_tenant_id ON master.licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON master.licenses(license_key);

-- 7. Master Devices (Authorized Hardware Terminals & POS Desktops)
CREATE TABLE IF NOT EXISTS master.devices (
    id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(128) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES master.tenants(id) ON DELETE CASCADE,
    firm_id VARCHAR(64) REFERENCES master.firms(id) ON DELETE SET NULL,
    license_id VARCHAR(64) REFERENCES master.licenses(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    fingerprint TEXT NOT NULL,
    browser_info TEXT,
    os_info TEXT,
    ip_address VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'Authorized' CHECK (status IN ('Authorized', 'Pending', 'Revoked', 'Blocked')),
    authorized_by VARCHAR(64),
    authorized_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_device UNIQUE (tenant_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_tenant_id ON master.devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON master.devices(device_id);

-- 8. Master Feature Overrides (Tenant & User Granular Overrides)
CREATE TABLE IF NOT EXISTS master.feature_overrides (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES master.tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES master.users(id) ON DELETE CASCADE,
    feature_key VARCHAR(64) NOT NULL,
    is_enabled BOOLEAN NOT NULL,
    override_reason TEXT,
    assigned_by VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_user_feature UNIQUE (tenant_id, user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_overrides_tenant_user ON master.feature_overrides(tenant_id, user_id);

-- 9. Master Patches (Modular Feature Extensions / .mbipatch Engine)
CREATE TABLE IF NOT EXISTS master.patches (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'MBI-PATCH-1001'
    patch_code VARCHAR(64) NOT NULL UNIQUE,
    version VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    checksum VARCHAR(128) NOT NULL,
    signature TEXT NOT NULL,
    target_features JSONB NOT NULL DEFAULT '[]'::jsonb,
    compatibility_min_app_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    is_security_critical BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Master Patch Assignments (Per-Tenant / Per-User Patch Deployment)
CREATE TABLE IF NOT EXISTS master.patch_assignments (
    id VARCHAR(64) PRIMARY KEY,
    patch_id VARCHAR(64) NOT NULL REFERENCES master.patches(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES master.tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES master.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by VARCHAR(64) NOT NULL,
    installed_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'Installed', 'Active', 'RolledBack', 'Failed')),
    CONSTRAINT uq_tenant_patch UNIQUE (tenant_id, user_id, patch_id)
);

CREATE INDEX IF NOT EXISTS idx_patch_assignments_tenant ON master.patch_assignments(tenant_id);

-- 11. Master Audit Logs (Immutable Governance & Mutation Tracker)
CREATE TABLE IF NOT EXISTS master.audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64),
    firm_id VARCHAR(64),
    user_id VARCHAR(64),
    user_name VARCHAR(255),
    user_role VARCHAR(64),
    device_id VARCHAR(128),
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    details TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(64),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON master.audit_logs(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON master.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON master.audit_logs(entity_type, entity_id);
