# MBI INVENTRA — Customization & Core Rules

## 🏢 Multi-Company / Multi-Tenant Single-Domain Standard

- **Master Server**: Controls global licensing, subscription tiers, feature flags, tenant provisioning and super-admin actions.
- **Tenant Isolation**: Every tenant (Company/Pharmacy) has a unique `tenant_id`. All MariaDB tables require `tenant_id`.
- **Zero Cross-Tenant Leakage**:
  - `tenant_id` is extracted strictly from the verified JWT / session on the backend.
  - Queries must always filter by `tenant_id`.
  - Real-time broadcasts (SSE/WebSocket) are isolated by tenant room (`tenant_${tenantId}`).
- **Company Sync**:
  - Devices (PC, Mobile, Tablet) inside a company sync bidirectionally with the central MariaDB and receive real-time updates for their own company only.
