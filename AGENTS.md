# 🏢 MBI INVENTRA — STRICT TENANT-ISOLATED SQLITE VAULT ARCHITECTURE RULES

## 1. Core Architecture Principle
**MBI INVENTRA** is a **Single-Domain, Multi-Company (Multi-Tenant)** Cloud POS & ERP system powered by **Tenant-Isolated SQLite Vaults**.
Multiple independent companies (e.g., ABC Pharma `001`, City Medicos `002`, Al-Shifa Pharmacy `003`) operate on the platform, and their business data is **100% physically and logically isolated** in separate SQLite database files.

```text
                         ┌──────────────────────────────┐
                         │       MBI INVENTRA           │
                         │       MASTER SERVER          │
                         │                              │
                         │  data/master/master_hub.db   │
                         │  License • Plans • Features  │
                         └──────────────┬───────────────┘
                                        │
                     ┌──────────────────┼──────────────────┐
                     │                  │                  │
                     ▼                  ▼                  ▼
              ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
              │  TENANT 001 │   │  TENANT 002 │   │  TENANT 003 │
              │ ABC PHARMA  │   │ CITY MEDICOS│   │ AL-SHIFA    │
              │tenant_1.db  │   │tenant_2.db  │   │tenant_3.db  │
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
              │ (HWID Bound)│   │ (HWID Bound)│   │ (HWID Bound)│
              └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
                     │                 │                  │
                     └──────────┐      │      ┌───────────┘
                                │      │      │
                                ▼      ▼      ▼
                         ┌──────────────────────┐
                         │   DELTA SYNC / SSE   │
                         │   (0ms IndexedDB)    │
                         └──────────────────────┘
```

---

## 2. Golden Entity Hierarchy
- **Master Vault (`data/master/master_hub.sqlite`)**: Platform administration, license validation, plan limits, tenant provisioning & kill switch.
- **Tenant Vault (`data/tenants/tenant_[tenant_id].sqlite`)**: Private SQLite database dedicated exclusively to that single company.
- **User / Sub-User**: Member belonging strictly to one tenant with a specific role (`Owner`, `Manager`, `Cashier`, `Pharmacist`).
- **Device Lock (HWID)**: Terminal / workstation locked on first login via unique hardware fingerprint.
- **Client Cache (IndexedDB)**: Client-side offline cache for instant 0ms billing.
- **Real-Time Sync**: Scoped strictly by `tenant_id`.

---

## 3. Mandatory Security Rules (Zero Data Leakage)
1. **Physical File Isolation**: Operations for Tenant `001` read/write exclusively to `tenant_001.sqlite`. No cross-tenant queries exist.
2. **Server-Side Session Extraction**: `tenant_id` is derived exclusively from the verified user session/JWT (`req.user.tenantId`).
3. **Single Device Lock**: Users and sub-users cannot log in from a 2nd device unless approved by Master Admin.
4. **Zero Cloud Bills**: 100% self-hosted on Node.js Native SQLite (DatabaseSync) with WAL Mode.
