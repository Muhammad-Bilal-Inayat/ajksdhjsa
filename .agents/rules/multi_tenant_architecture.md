# 🏢 MBI INVENTRA — STRICT MULTI-TENANT ARCHITECTURE RULES

## 1. Core Architecture Principle
**MBI INVENTRA** is a **Single-Domain, Multi-Company (Multi-Tenant)** Cloud POS & ERP system.
Multiple independent companies (e.g., ABC Pharma `001`, City Medicos `002`, Al-Shifa Pharmacy `003`) operate on the same platform domain and shared central MariaDB, but their business data is **100% logically isolated and strictly partitioned**.

```text
                         ┌──────────────────────────────┐
                         │       MBI INVENTRA           │
                         │       MASTER SERVER          │
                         │                              │
                         │ License • Plans • Features   │
                         │ Tenant Control • Updates     │
                         └──────────────┬───────────────┘
                                        │
                     ┌──────────────────┼──────────────────┐
                     │                  │                  │
                     ▼                  ▼                  ▼
              ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
              │  TENANT 001 │   │  TENANT 002 │   │  TENANT 003 │
              │ ABC PHARMA  │   │ CITY MEDICOS│   │ AL-SHIFA    │
              └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
                     │                 │                  │
          ┌──────────┼────────┐   ┌────┼─────────┐   ┌────┼─────────┐
          │          │        │   │    │         │   │    │         │
          ▼          ▼        ▼   ▼    ▼         ▼   ▼    ▼         ▼
        OWNER      MANAGER  CASHIER OWNER      CASHIER OWNER      PHARMACIST
          │          │        │   │              │   │              │
          └──────────┼────────┘   └────┬─────────┘   └────┬─────────┘
                     │                 │                  │
                     ▼                 ▼                  ▼
              ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
              │ PC / MOBILE │   │ PC / MOBILE │   │ PC / MOBILE │
              │   DEVICES   │   │   DEVICES   │   │   DEVICES   │
              └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
                     │                 │                  │
                     └──────────┐      │      ┌───────────┘
                                │      │      │
                                ▼      ▼      ▼
                         ┌──────────────────────┐
                         │     SYNC / API       │
                         │   SSE / WEBSOCKET    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       MariaDB        │
                         │                      │
                         │ tenant_id = 001      │
                         │ tenant_id = 002      │
                         │ tenant_id = 003      │
                         └──────────────────────┘
```

---

## 2. Golden Entity Hierarchy

- **Master Server**: Global system administration, license keys, plan tiers, feature flags, tenant provisioning & kill switch.
- **Tenant**: Company / Organization identity & hard boundary (`tenant_id`).
- **Branch / Counter / Firm**: Physical or logical sub-location inside a tenant (`firm_id` / `branch_id`).
- **User**: Member belonging strictly to one tenant with a specific role (`Owner`, `Manager`, `Cashier`, `Pharmacist`, etc.).
- **Device**: Registered terminal / workstation belonging to a tenant/user.
- **Central Database (MariaDB)**: Multi-tenant database where every business record has a mandatory `tenant_id`.
- **Local Client (IndexedDB)**: Client-side offline cache and outbox queue strictly scoped to the active tenant.
- **Real-Time Sync (SSE / WebSocket)**: Channel partitioned strictly by `tenant_id`.

---

## 3. Mandatory Backend Security Rules (ZERO Data Leakage)

1. **Mandatory `tenant_id` Column**:
   All business tables (`mbi_users`, `mbi_medicines`, `mbi_parties`, `mbi_purchases`, `mbi_sales`, `mbi_invoices`, `mbi_inventory_batches`, `mbi_expenses`, `mbi_audit_logs`, `mbi_settings`, etc.) MUST contain `tenant_id`.

2. **Strict Server-Side Session Extraction**:
   - Backend MUST NEVER trust `tenant_id` from client request bodies, parameters, or unverified headers.
   - `tenant_id` is extracted strictly from the cryptographically verified JWT (`req.user.tenantId`).
   - Any spoofing attempt where a client header `x-tenant-id` conflicts with `req.user.tenantId` MUST be rejected with `403 Forbidden`.

3. **Query Parameterization**:
   All database queries must append `WHERE tenant_id = ?` using the authenticated tenant ID.

4. **Real-time Event Scoping**:
   - SSE and WebSocket broadcast events must only be sent to listeners matching the sender's `tenant_id`.
   - Cashier sales or stock mutations in Tenant `001` must NEVER be broadcast to Tenant `002` or `003`.

---

## 4. Offline & Multi-Device Sync Contract

1. **Offline Billing Continuity**: Cashiers continue billing 100% offline via IndexedDB.
2. **Idempotent Sync Ingestion**: When devices reconnect, queued mutations sync to `/api/sync/batch` using unique idempotency keys (`${tenant_id}_${entityId}_${timestamp}`).
3. **Atomic Stock Delta**: Inventory stock updates are executed as atomic decrements per batch inside the tenant boundary.
4. **Intra-Company Broadcast**: Upon successful sync, the server broadcasts an event only to connected devices of that specific `tenant_id`.
