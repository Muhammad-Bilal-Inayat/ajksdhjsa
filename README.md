# MBI INVENTRA - Enterprise Pharmacy ERP & Master Fleet Station
**Version:** `v4.3.7-stable` | **Release Channel:** `Enterprise Production`

MBI INVENTRA is a mission-critical, offline-first Pharmacy Management System, POS Billing Station, and Multi-Tenant Central Fleet Server designed for Pakistani and global pharmacies, medical stores, and healthcare chains.

---

## 🌟 What's New in v4.3.7
- **AI Daily Message Quota Governance:**
  - **Silver Basic Plan:** 20 questions/day.
  - **Gold Business Plan:** 50 questions/day.
  - **Platinum Enterprise Plan:** 200 questions/day.
  - **Trial & Unauthenticated Guest Visitors (Home Page):** 20 free questions/day per browser/device.
- **Zero-Error Guest Architecture:** Built-in date-keyed local device ID (`getGuestAiId()`) guarantees brand-new visitors never hit false 0-quota limit errors on first visit.
- **Page Scroll Jump Resolution:** Eliminated disruptive page auto-scrolling on initial component mount and chat update; chat auto-scroll is strictly contained within its dedicated scrollable container, and page always initializes cleanly from top.
- **Super Admin AI Quotas & Limit Override Control:** Added dedicated AI Quotas control tab in `/server` (Master Station) allowing Super Admin to instantly reset usage count to 0, increase daily limits, or grant custom quotas for any pharmacy or user in real time.

---

## 🌟 What's New in v4.3.6
- **Compare MBI INVENTRA Editions Feature Matrix & User Side Integration:**
  - Integrated the official 17-point feature comparison modal (`PlanComparisonModal`) directly into the User Client Portal (`/pricing` - Plans & Licensing).
  - Prominent "Compare Editions" buttons added in the header action bar and below the billing duration selectors.
  - Fully synchronized 17-point matrix comparing 0.2s POS, WhatsApp Auto-Gateway (Enterprise) vs 1-Click Direct (Silver/Gold), FEFO Expiry Radar, FBR POS Fiscal Stamps, Wholesale Pricing, Multi-Godowns, and 50GB NVMe Cloud Mirroring.
- **100% Unified & Synchronized Subscription Plan Features:**
  - Standardized single source of truth across all 3 portals: Public Home Page (`PricingSection`), Client Portal (`Pricing.tsx` & `PricingModal.tsx`), and Super Admin Server Station (`PlanPricingManagerPanel` & `planLimitsService.ts`).
  - **Silver Basic:** 2 Users • 2 Branches • 2 Terminals • 0.2s POS Barcode Billing • 100k+ Medicine Catalog • 1-Click WhatsApp Direct • Ledgers • 100% Offline Local Engine.
  - **Gold Business:** 5 Users • 5 Branches • 5 Terminals • FEFO Expiry Radar • Multi-Godown Storage • Live Real-Time P&L Profit Analytics • Wholesale Dual Pricing Matrix • Multi-Terminal Hardware Sync.
  - **Platinum Enterprise:** 15 Users • 10 Branches • 15 Terminals • Automated Background WhatsApp Gateway • FBR POS Digital Invoicing & Fiscal Stamps • Multi-Branch Stock Transfers • Online Storefront • Anti-Theft Audit Logs • 50GB NVMe Cloud Mirroring.
- **Company-Wise WhatsApp Automation Hub (100% Free & Zero-Cost):**
  - **Enterprise Background Auto-Gateway:** Automatically dispatches digital invoices, return credit notes, customer khata payment receipts, and daily shift summaries directly in the background via the pharmacy's attached WhatsApp number.
  - **Silver & Gold 1-Click WhatsApp Direct:** Allows 1-click billing dispatch via direct `wa.me` instant chat with pre-formatted invoice text without monthly subscription fees or third-party WhatsApp API costs.
  - **Live Super Admin Gateway Override:** Super Admin can dynamically toggle/override the Background WhatsApp Gateway `ON` or `OFF` for any client company at any time directly from `/server` Fleet Dashboard without modifying base subscription tiers.
- **Strict Master PIN Security Lockdown:** Deprecated PIN `884422` completely removed. Master Server Station (`/server`, `/lan`) is strictly authorized only with Primary Master PIN (`Ami7788!@`) and Emergency Recovery Key (`03082003`).
- **100% Multi-Tenant Data Isolation:** Verified 20+ MariaDB database tables. Every registered client pharmacy operates as an isolated Tenant (`mbi_tenants`), and their counter staff exist as scoped sub-users (`mbi_users`).
- **100% Real-Time Master Station & Unified Governance Sync:** Fixed registration query placeholder alignment in `mbi_tenants`. Newly registered tenants, users, and licenses immediately populate across all 25 tabs of `/server`, `/lan`, Unified Governance, and Masterboard 173 features in real time.
- **Automatic Database Integrity Repair:** Built-in auto-repair on startup automatically populates any missing `tenant_id` and `organization_id` columns in `mbi_tenants`, `mbi_users`, and `mbi_licenses`.
- **Multi-Key Robust Query Join:** Queries now join across `id`, `tenant_id`, and `organization_id` seamlessly with zero dropped records.
- **Sanitized Public Health Metrics:** Public `/api/health` and `/health` endpoints now return sanitized status (`"database": "Connected"` instead of exposing internal database schema names like `mbi72dn`), preventing sensitive database discovery.
- **Production 503 Crash Shield:** Added process-level uncaught exception & unhandled promise rejection interceptors in `server.ts` to prevent transient Node.js process crashes and eliminate 503 Service Unavailable errors on live VPS/NexPanel/cPanel servers.
- **MariaDB 30s Background Keep-Alive Ping:** Active keepalive heartbeat prevents MySQL/MariaDB idle `wait_timeout` disconnects and socket drops.
- **Silent Background Hardware Auto-Binding:** Fixed registration onboarding glitch — eliminated flickering/flashing device binding popups on registration. Device HWID is now silently auto-detected and bound seamlessly in the background.
- **Enterprise-Restricted FBR POS Digital Invoicing:** FBR POS integration, digital sales tax stamps, STRN/NTN compliance, and FBR audit reports are strictly governed and accessible under the Enterprise / Platinum tier.
- **Company-Wise LAN Multi-Terminal Configuration:** Configure up to 5 dedicated counter PCs per company (e.g. Retail POS, Wholesale B2B, Stock Inward, Godown Delivery, Mobile Tablet POS) with static LAN IP binding and hardware HWID locks.
- **100% Cryptographic Multi-Tenant Data Isolation:** Strict database and network partition ensuring every company's sales, purchases, inventory, batches, and customers are strictly locked to that company's 5 terminals, with zero cross-company data leakage.
- **Client-Side Server Updates Segregation:** Completely removed server updates and internal server tools from client/user navigation and Settings (`User Manual & Guides`), preserving `/server` and `/lan` strictly for Super Admin with Master PIN (`Ami7788!@` / `03082003`).
- **Targeted Store Broadcasts:** Dispatch high-priority popup announcements directly to all 5 counters of a selected company or a specific counter station with sound alerts and read receipts.
- **Trial Countdown Banner & Header Layering Polished:** Fixed z-index stacking context on top trial countdown banner (`z-10`) and elevated Header Company Profile / Branch flyout dropdown (`z-[9995]`).
- **100% Rock-Solid Zero Auto-Reload Stability:** Removed all automatic `window.location.reload()` hooks from `main.tsx` (`vite:preloadError`) and `App.tsx` (`lazyWithRetry`), ensuring completely uninterrupted and stable cashier sessions.
- **Fixed Master Server Hub Loading:** Fixed missing `Network` icon reference in `MasterServerHub.tsx`, resolving blank page on `/server` and `/lan`.
- **Clean Direct Home Landing Boot:** Restored standard direct home page loading with zero splash delays and instant first-paint.
- **Persistent Login Sessions:** Permanent authenticated local sessions with zero automatic logouts until explicitly clicked by the user.
- **Direct Master Hub & LAN Station Access:** Directly mounted `/server`, `/lan`, and `/server/lan` for instant opening with Master Security Key (`Ami7788!@` / `03082003`).
- **LAN Multi-PC Counter Sync Hub (`/lan`):** Connect secondary cashier laptops and billing counters directly via Ethernet LAN cable or local Wi-Fi router (0.8ms latency) without requiring active internet.
- **Universal User Popup Broadcast:** Push instant interactive modal announcements with audio chimes and read-acknowledgments to all or specific pharmacy counters in real time via SSE.
- **Zero-Crash Low-Speed & Offline Guard:** Throttles delta mutations smoothly in batches of 5–10 items over slow dial-up/2G connections, preventing browser lockups and database timeouts.
- **Unified 25 Master Hub Tabs:** 100% mutual synchronization across MariaDB (`mbi_users`, `mbi_tenants`, `mbi_licenses`, `mbi_audit_logs`), local caches, and the client portal.

---

## 🚀 Key Master Server Routes
| Route | Description | Access Level |
|---|---|---|
| `/server` | Master Server Hub (25 Fleet Operations Tabs) | Master PIN (`Ami7788!@` / `03082003`) |
| `/lan` or `/server/lan` | LAN Multi-PC Counter Sync & User Broadcast Hub | Master PIN Protected |
| `/user` | Client Pharmacy POS, Billing, Inventory & Ledgers | Authenticated Staff / Cashier |
| `/login` & `/register` | Staff Authentication & 1-Device Hardware Binding | Public / Tenant |

---

## 💻 Local & Server Setup Instructions

### 1. Prerequisites
- **Node.js:** v18+ / v20+ / v22+
- **Database:** MariaDB / MySQL (or built-in local sync cache engine)

### 2. Installation & Running
```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Production Build
npm run build
```

### 3. Database Schema Import
Import the comprehensive schema located at [`server/db/mbi_inventra_master_schema.sql`](server/db/mbi_inventra_master_schema.sql) into phpMyAdmin or MariaDB:
```bash
mysql -u root -p mbi72dn < server/db/mbi_inventra_master_schema.sql
```

---

## 🛡️ License & Copyright
© 2026 MBI INVENTRA. All rights reserved. Developed with advanced agentic engineering.
