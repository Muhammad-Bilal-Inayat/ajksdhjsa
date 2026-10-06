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

---

## 4. 🔒 SACROSANCT UNTOUCHABLE DATA FILES (STRICT ZERO-TOUCH POLICY)
The following files and folders contain active live business data for Tenants, Users, and Sub-users.
**STRICT RULE:** NO automated build, script, migration, commit, git push/pull, or code edit is EVER permitted to delete, drop, wipe, rename, overwrite, or mutate these files:

| Storage Layer | Path / Location | Contains | Touch Policy |
| :--- | :--- | :--- | :--- |
| **Master Hub Vault** | `server/data/master/master_hub.sqlite` | Registered Tenants (`mbi_tenants`), Licenses (`mbi_licenses`), Users (`mbi_users`), HWIDs (`mbi_registered_devices`) | ⛔ **NEVER TOUCH / NEVER WIPE** |
| **Tenant SQLite Vaults** | `server/data/tenants/tenant_*.sqlite` | Company inventory, invoices, cashiers, sub-users, parties, ledgers | ⛔ **NEVER TOUCH / NEVER WIPE** |
| **Runtime Sync Storage** | `.sync_data.json` & `.*.json` | Fallback persistence & local caching | ⛔ **NEVER COMMIT / NEVER WIPE** |
| **MariaDB Live Cloud** | `mbi_tenants`, `mbi_users`, `mbi_licenses` | Cloud synchronized company and staff accounts | ⛔ **NEVER DROP TABLES** |

---

## 5. 🛡️ ZERO SETTINGS MUTATION POLICY (PRESERVE ALL EXISTING TENANT CONFIGS)
When adding, updating, or removing features in the codebase:
1. **Never Reset Settings**: NEVER overwrite, reset, or wipe existing tenant store settings, business profiles, invoice numbering/templates, column preferences, cashier PINs, or module permissions.
2. **Non-Destructive Additive Schemas**: Database schema upgrades must strictly use non-destructive checks (`ALTER TABLE ADD COLUMN` with safe defaults). Never drop or alter existing columns or default values.
3. **Graceful Fallbacks**: New feature flags must default gracefully in memory/code without altering existing saved tenant records.
4. **Pure Code Updates**: All updates apply strictly to frontend/backend logic and UI components, leaving live tenant configurations and business records 100% untouched.


