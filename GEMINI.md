# MBI INVENTRA — Customization & Core Rules

## 🏢 Multi-Company / Multi-Tenant Single-Domain Standard (SQLite Vault Engine)

- **Master Server Vault**: Controls global licensing, subscription tiers, feature flags, tenant provisioning and super-admin actions via `server/data/master/master_hub.sqlite`.
- **Tenant Hard Physical Isolation**: Every tenant (Company/Pharmacy) has a private, isolated SQLite database file `server/data/tenants/tenant_[tenant_id].sqlite`.
- **Zero Cross-Tenant Leakage**:
  - `tenant_id` is derived strictly from the cryptographically verified JWT / session on the backend.
  - Operations are routed exclusively to the tenant's own private SQLite database file.
  - Real-time broadcasts (SSE/WebSocket) are isolated by tenant room (`tenant_${tenantId}`).
- **Company Sync**:
  - Devices (PC, Mobile, POS Terminal) inside a company sync bidirectionally with their isolated tenant vault and receive real-time updates for their own company only.
