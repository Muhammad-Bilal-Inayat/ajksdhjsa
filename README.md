# MBI INVENTRA - Enterprise Pharmacy ERP & Master Fleet Station
**Version:** `v4.3.0-stable` | **Release Channel:** `Enterprise Production`

MBI INVENTRA is a mission-critical, offline-first Pharmacy Management System, POS Billing Station, and Multi-Tenant Central Fleet Server designed for Pakistani and global pharmacies, medical stores, and healthcare chains.

---

## 🌟 What's New in v4.3.0
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
