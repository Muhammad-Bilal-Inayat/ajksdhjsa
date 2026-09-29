# MBI INVENTRA — Project Architecture & Rules

## Multi-Tenant Single-Domain Architecture (Unbreakable Rules)

1. **System Type**: MBI Inventra is a Single-Domain, Multi-Company (Multi-Tenant) Cloud POS & ERP platform.
2. **Hard Isolation**: All companies share the central MariaDB and the same server instance, but their data is 100% logically isolated via `tenant_id`.
3. **Master Server**: Controls licenses, plans, features, and tenant activation/suspension.
4. **Tenant Scope**: Each company (Tenant 001, 002, 003...) has its own independent records (users, medicines, parties, purchases, sales, stock, invoices, reports).
5. **Intra-Company Sync**: Real-time events (SSE/WebSocket) and offline synchronization are strictly scoped to the tenant's own users and devices.
6. **Security Mandate**: Never trust client-supplied `tenant_id`. Always derive `tenant_id` from the cryptographically verified user session/JWT. Block any cross-tenant access attempts immediately.
