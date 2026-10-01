-- ==============================================================================
-- MBI INVENTRA ENTERPRISE — COMPLETE MASTER MARIADB & PHPMYADMIN DDL SCHEMA
-- Target Database: mbi72dn (MARIADB 10.5+ / 11.x / MYSQL 8.0+ / phpMyAdmin 5.x)
-- Single-Source Master SQL with Multi-Tenant Zero-Data-Leakage Logical Isolation
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `mbi72dn` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `mbi72dn`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+05:00";

-- ----------------------------------------------------------------------------
-- 1. PLANS & TIERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_plans` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `tier` VARCHAR(64) NOT NULL DEFAULT 'Basic',
  `plan_type` VARCHAR(64) NULL DEFAULT 'basic',
  `price_monthly` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `price_yearly` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `monthly_price_pkr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `annual_price_pkr` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `max_users` INT NOT NULL DEFAULT 5,
  `max_branches` INT NOT NULL DEFAULT 1,
  `max_devices` INT NOT NULL DEFAULT 5,
  `max_terminals` INT NOT NULL DEFAULT 5,
  `storage_limit_mb` INT NOT NULL DEFAULT 5000,
  `features` LONGTEXT NULL,
  `features_json` LONGTEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. TENANTS (COMPANIES / PHARMACIES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_tenants` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NULL,
  `organization_id` VARCHAR(128) NULL,
  `name` VARCHAR(255) NOT NULL,
  `legal_name` VARCHAR(255) NULL,
  `owner_name` VARCHAR(255) NOT NULL DEFAULT 'Store Owner',
  `owner_phone` VARCHAR(64) NOT NULL DEFAULT '',
  `owner_email` VARCHAR(255) NULL,
  `contact_phone` VARCHAR(64) NULL,
  `contact_email` VARCHAR(255) NULL,
  `city` VARCHAR(128) NOT NULL DEFAULT 'Sargodha',
  `address` TEXT NULL,
  `drug_license_no` VARCHAR(128) NULL,
  `ntn_number` VARCHAR(64) NULL,
  `tax_ntn_number` VARCHAR(64) NULL,
  `api_key` VARCHAR(255) NULL,
  `plan` VARCHAR(64) NOT NULL DEFAULT 'Basic',
  `plan_id` VARCHAR(64) NOT NULL DEFAULT 'Basic',
  `status` VARCHAR(64) NOT NULL DEFAULT 'Active',
  `subscription_plan` VARCHAR(64) NOT NULL DEFAULT 'Basic',
  `subscription_status` VARCHAR(64) NOT NULL DEFAULT 'Active',
  `storage_limit_mb` INT NOT NULL DEFAULT 5000,
  `storage_used_mb` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `app_version` VARCHAR(32) NOT NULL DEFAULT 'v4.3.0',
  `trial_expires_at` DATETIME NULL,
  `trial_expiry_date` DATE NULL,
  `features_json` LONGTEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_emergency_locked` TINYINT(1) NOT NULL DEFAULT 0,
  `last_sync_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_phone` (`owner_phone`),
  KEY `idx_tenant_status` (`status`),
  KEY `idx_tenant_api_key` (`api_key`),
  KEY `idx_tenant_org` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. USERS & STAFF GOVERNANCE (MBI_USERS + STANDARD USERS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_users` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(128) NULL,
  `email_or_phone` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(64) NULL,
  `passcode` VARCHAR(255) NOT NULL DEFAULT '0000',
  `api_key` VARCHAR(255) NULL,
  `role` VARCHAR(64) NOT NULL DEFAULT 'Cashier',
  `is_primary_owner` TINYINT(1) NOT NULL DEFAULT 0,
  `is_primary_admin` TINYINT(1) NOT NULL DEFAULT 0,
  `is_online` TINYINT(1) NOT NULL DEFAULT 0,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Active',
  `is_kill_switch_active` TINYINT(1) NOT NULL DEFAULT 0,
  `is_silent_monitored` TINYINT(1) NOT NULL DEFAULT 0,
  `can_edit_bill` TINYINT(1) NOT NULL DEFAULT 0,
  `allowed_modules` LONGTEXT NULL,
  `permissions` LONGTEXT NULL,
  `notes` TEXT NULL,
  `totp_secret` VARCHAR(128) NULL,
  `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mbi_user_tenant` (`tenant_id`),
  KEY `idx_mbi_user_lookup` (`email_or_phone`, `username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL DEFAULT '',
  `business_name` VARCHAR(255) NULL,
  `role` VARCHAR(64) NOT NULL DEFAULT 'cashier',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_users` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. LICENSES & HARDWARE HWID VAULT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_licenses` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NULL,
  `pharmacy_name` VARCHAR(255) NULL,
  `license_key` VARCHAR(128) NOT NULL,
  `api_key` VARCHAR(255) NULL,
  `client_name` VARCHAR(255) NOT NULL DEFAULT 'Pharmacy Store',
  `owner_name` VARCHAR(255) NOT NULL DEFAULT 'Store Owner',
  `phone` VARCHAR(64) NOT NULL DEFAULT '',
  `city` VARCHAR(128) NOT NULL DEFAULT 'Lahore',
  `plan` VARCHAR(64) NOT NULL DEFAULT 'Basic',
  `plan_tier` VARCHAR(64) NOT NULL DEFAULT 'Gold Business',
  `status` VARCHAR(64) NOT NULL DEFAULT 'Active',
  `issue_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `expires_at` DATETIME NULL,
  `max_users` INT NOT NULL DEFAULT 5,
  `max_branches` INT NOT NULL DEFAULT 5,
  `max_devices` INT NOT NULL DEFAULT 5,
  `max_terminals` INT NOT NULL DEFAULT 5,
  `bound_hwid` VARCHAR(255) NULL,
  `bound_hardware_ids` LONGTEXT NULL,
  `sale_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_lic_key` (`license_key`),
  KEY `idx_lic_tenant` (`tenant_id`),
  KEY `idx_lic_api_key` (`api_key`),
  KEY `idx_lic_hwid` (`bound_hwid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. MEDICINES & DRUG REGISTRY (MBI_MEDICINES + MEDICINES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_medicines` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `generic_salt` VARCHAR(255) NULL,
  `company` VARCHAR(255) NULL,
  `category` VARCHAR(128) NULL,
  `dosage_form` VARCHAR(64) NULL,
  `strength` VARCHAR(64) NULL,
  `barcode` VARCHAR(128) NULL,
  `min_stock_level` INT NOT NULL DEFAULT 5,
  `pack_size` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mbi_med_tenant` (`tenant_id`),
  KEY `idx_mbi_med_barcode` (`barcode`),
  KEY `idx_mbi_med_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `medicines` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NULL,
  `name` VARCHAR(255) NOT NULL,
  `generic_salt` VARCHAR(255) NULL,
  `company` VARCHAR(255) NULL,
  `category` VARCHAR(128) NULL,
  `dosage_form` VARCHAR(64) NULL,
  `strength` VARCHAR(64) NULL,
  `barcode` VARCHAR(128) NULL,
  `cost_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sale_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_med_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. INVENTORY BATCHES (FEFO FIRST-EXPIRY-FIRST-OUT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_inventory_batches` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `medicine_id` VARCHAR(128) NULL,
  `medicine_name` VARCHAR(255) NOT NULL,
  `batch_number` VARCHAR(128) NOT NULL,
  `expiry_date` DATE NOT NULL,
  `current_stock_quantity` INT NOT NULL DEFAULT 0,
  `initial_stock_quantity` INT NOT NULL DEFAULT 0,
  `cost_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sale_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `location_rack` VARCHAR(64) NULL,
  `supplier_id` VARCHAR(128) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batch_tenant` (`tenant_id`),
  KEY `idx_batch_fefo` (`expiry_date`, `current_stock_quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. POS INVOICES & SALES (MBI_INVOICES + SALES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_invoices` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `invoice_number` VARCHAR(128) NOT NULL,
  `customer_name` VARCHAR(255) NULL DEFAULT 'Walk-in Customer',
  `customer_phone` VARCHAR(64) NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `change_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `balance_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_type` VARCHAR(64) NOT NULL DEFAULT 'Cash',
  `status` VARCHAR(64) NOT NULL DEFAULT 'Completed',
  `is_voided` TINYINT(1) NOT NULL DEFAULT 0,
  `cashier_name` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inv_tenant` (`tenant_id`),
  KEY `idx_inv_num` (`invoice_number`),
  KEY `idx_inv_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NULL,
  `invoice_no` VARCHAR(128) NOT NULL,
  `customer_name` VARCHAR(255) NULL,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `net_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_mode` VARCHAR(64) NOT NULL DEFAULT 'Cash',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. INVOICE LINE ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_invoice_items` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `invoice_id` VARCHAR(128) NOT NULL,
  `medicine_id` VARCHAR(128) NULL,
  `medicine_name` VARCHAR(255) NOT NULL,
  `batch_number` VARCHAR(128) NULL,
  `expiry_date` DATE NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `total_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invitem_tenant` (`tenant_id`),
  KEY `idx_invitem_invoice` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. PURCHASES (MBI_PURCHASES + PURCHASES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_purchases` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `purchase_number` VARCHAR(128) NOT NULL,
  `supplier_name` VARCHAR(255) NOT NULL,
  `supplier_invoice_no` VARCHAR(128) NULL,
  `purchase_date` DATE NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `balance_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_status` VARCHAR(64) NOT NULL DEFAULT 'Paid',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pur_tenant` (`tenant_id`),
  KEY `idx_pur_num` (`purchase_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchases` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NULL,
  `bill_no` VARCHAR(128) NOT NULL,
  `supplier_name` VARCHAR(255) NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purchases_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_purchase_items` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `purchase_id` VARCHAR(128) NOT NULL,
  `medicine_id` VARCHAR(128) NULL,
  `medicine_name` VARCHAR(255) NOT NULL,
  `batch_number` VARCHAR(128) NOT NULL,
  `expiry_date` DATE NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `cost_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sale_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_puritem_tenant` (`tenant_id`),
  KEY `idx_puritem_purchase` (`purchase_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. PARTIES & KHATA LEDGERS (CUSTOMERS, SUPPLIERS, PARTIES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `parties` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(64) NOT NULL DEFAULT 'customer',
  `phone` VARCHAR(64) NULL,
  `address` TEXT NULL,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parties_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_customers` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(64) NULL,
  `city` VARCHAR(128) NULL DEFAULT 'Lahore',
  `address` TEXT NULL,
  `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `credit_limit` DECIMAL(12,2) NOT NULL DEFAULT 100000.00,
  `status` VARCHAR(32) NOT NULL DEFAULT 'Active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cust_tenant` (`tenant_id`),
  KEY `idx_cust_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_suppliers` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `company_name` VARCHAR(255) NULL,
  `phone` VARCHAR(64) NULL,
  `city` VARCHAR(128) NULL DEFAULT 'Lahore',
  `address` TEXT NULL,
  `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `drug_license_no` VARCHAR(128) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'Active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supp_tenant` (`tenant_id`),
  KEY `idx_supp_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_customer_ledger` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `customer_id` VARCHAR(128) NOT NULL,
  `invoice_id` VARCHAR(128) NULL,
  `transaction_type` VARCHAR(64) NOT NULL DEFAULT 'SALE',
  `debit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `credit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `running_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `description` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_custldg_tenant` (`tenant_id`),
  KEY `idx_custldg_cust` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_supplier_ledger` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `supplier_id` VARCHAR(128) NOT NULL,
  `purchase_id` VARCHAR(128) NULL,
  `transaction_type` VARCHAR(64) NOT NULL DEFAULT 'PURCHASE',
  `debit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `credit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `running_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `description` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_suppldg_tenant` (`tenant_id`),
  KEY `idx_suppldg_supp` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. EXPENSES (MBI_EXPENSES + EXPENSES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_expenses` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(128) NOT NULL DEFAULT 'General',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `expense_date` DATE NOT NULL,
  `notes` TEXT NULL,
  `created_by` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mbi_exp_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NULL,
  `category` VARCHAR(128) NOT NULL DEFAULT 'General',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `date` DATE NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. CASHIER SHIFTS (MBI_CASHIER_SHIFTS + SHIFTS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_cashier_shifts` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(128) NOT NULL,
  `cashier_name` VARCHAR(255) NOT NULL,
  `terminal_name` VARCHAR(128) NOT NULL DEFAULT 'Terminal #1',
  `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `closing_balance` DECIMAL(12,2) NULL,
  `expected_cash` DECIMAL(12,2) NULL,
  `total_cash_sales` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_card_sales` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_credit_sales` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_returns` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `opened_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` DATETIME NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'Open',
  PRIMARY KEY (`id`),
  KEY `idx_mbi_shift_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shifts` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NULL,
  `user_id` VARCHAR(128) NOT NULL,
  `opening_cash` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `closing_cash` DECIMAL(12,2) NULL,
  `opened_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_shifts_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. SECURITY AUDIT LOGS & FLEET DEVICES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_devices` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(128) NOT NULL,
  `device_name` VARCHAR(255) NOT NULL,
  `device_type` VARCHAR(64) NOT NULL DEFAULT 'Desktop',
  `platform` VARCHAR(64) NOT NULL DEFAULT 'Windows',
  `browser_info` VARCHAR(255) NULL,
  `os` VARCHAR(128) NULL,
  `hwid` VARCHAR(255) NOT NULL,
  `installation_id` VARCHAR(255) NULL,
  `authorization_key` VARCHAR(128) NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Active',
  `first_authorized_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_device_tenant` (`tenant_id`),
  KEY `idx_device_hwid` (`hwid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_audit_logs` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(128) NULL,
  `user_name` VARCHAR(255) NULL,
  `action` VARCHAR(128) NOT NULL,
  `details` LONGTEXT NULL,
  `ip_address` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_tenant` (`tenant_id`),
  KEY `idx_audit_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. NOTIFICATIONS, BROADCASTS & REGISTRATION LEADS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_notifications` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `recipient_phone` VARCHAR(64) NULL,
  `recipient_name` VARCHAR(255) NULL,
  `notification_type` VARCHAR(64) NOT NULL DEFAULT 'SYSTEM_UPDATE',
  `message_body` TEXT NULL,
  `title` VARCHAR(255) NULL,
  `message` LONGTEXT NULL,
  `target_scope` VARCHAR(64) NOT NULL DEFAULT 'ALL',
  `target_tenant_id` VARCHAR(128) NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'SYSTEM_UPDATE',
  `priority` VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
  `status` VARCHAR(32) NOT NULL DEFAULT 'Sent',
  `created_by` VARCHAR(128) NOT NULL DEFAULT 'Master Admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_registration_leads` (
  `id` VARCHAR(128) NOT NULL,
  `store_name` VARCHAR(255) NOT NULL,
  `owner_name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(128) NULL,
  `phone` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) NULL,
  `city` VARCHAR(128) NOT NULL DEFAULT 'Lahore',
  `address` TEXT NULL,
  `drug_license_no` VARCHAR(128) NULL,
  `ntn_number` VARCHAR(64) NULL,
  `requested_plan` VARCHAR(128) NOT NULL DEFAULT 'Basic (10-Day Free Trial)',
  `status` VARCHAR(64) NOT NULL DEFAULT 'activated',
  `is_approved` TINYINT(1) NOT NULL DEFAULT 1,
  `activation_key` VARCHAR(128) NULL,
  `notes` TEXT NULL,
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activated_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lead_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 15. PRINT TEMPLATES & SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_print_templates` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `template_id` VARCHAR(128) NULL,
  `template_name` VARCHAR(255) NOT NULL,
  `page_size` VARCHAR(64) NOT NULL DEFAULT 'thermal_80mm',
  `config_json` LONGTEXT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `store_name` VARCHAR(255) NULL,
  `phone_numbers` VARCHAR(255) NULL,
  `country_city` VARCHAR(255) NULL,
  `footer_title` VARCHAR(255) NULL,
  `footer_contact` VARCHAR(255) NULL,
  `footer_website` VARCHAR(255) NULL,
  `compact_footer` TINYINT(1) NOT NULL DEFAULT 0,
  `is_client_locked` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_print_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_settings` (
  `setting_key` VARCHAR(128) NOT NULL,
  `setting_value` LONGTEXT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 16. CLINICAL PRESCRIPTIONS & DRUG RECALLS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_prescriptions` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `prescription_number` VARCHAR(100) NOT NULL,
  `doctor_name` VARCHAR(255) NOT NULL,
  `doctor_pmdc_no` VARCHAR(100) NULL,
  `patient_name` VARCHAR(255) NOT NULL,
  `patient_age` INT NULL,
  `patient_gender` VARCHAR(16) NULL DEFAULT 'Male',
  `patient_phone` VARCHAR(64) NULL,
  `invoice_id` VARCHAR(128) NULL,
  `prescribed_items` LONGTEXT NULL,
  `prescription_image_url` TEXT NULL,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_presc_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_supplier_returns` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `debit_note_number` VARCHAR(100) NOT NULL,
  `supplier_id` VARCHAR(128) NOT NULL,
  `supplier_name` VARCHAR(255) NOT NULL,
  `return_date` DATE NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `reason` VARCHAR(255) NOT NULL DEFAULT 'Near Expiry / Expired',
  `status` VARCHAR(32) NOT NULL DEFAULT 'Processed',
  `items_json` LONGTEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sreturn_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_stock_transfers` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `transfer_number` VARCHAR(100) NOT NULL,
  `source_godown` VARCHAR(100) NOT NULL DEFAULT 'Main Store',
  `destination_godown` VARCHAR(100) NOT NULL,
  `transfer_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_items` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'Completed',
  `notes` TEXT NULL,
  `items_json` LONGTEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_st_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_product_recalls` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `medicine_name` VARCHAR(255) NOT NULL,
  `batch_number` VARCHAR(128) NOT NULL,
  `reason` TEXT NOT NULL,
  `regulatory_authority` VARCHAR(128) NOT NULL DEFAULT 'DRAP Pakistan',
  `status` VARCHAR(32) NOT NULL DEFAULT 'Quarantined',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recall_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_quarantine_stock` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `medicine_name` VARCHAR(255) NOT NULL,
  `batch_number` VARCHAR(128) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `reason` VARCHAR(255) NOT NULL,
  `quarantined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quar_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_ai_chat_history` (
  `id` VARCHAR(128) NOT NULL,
  `session_id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `store_name` VARCHAR(255) NULL,
  `user_name` VARCHAR(255) NULL,
  `user_phone` VARCHAR(64) NULL,
  `user_plan` VARCHAR(64) NULL,
  `sender` VARCHAR(64) NOT NULL,
  `sender_name` VARCHAR(128) NULL,
  `prompt_or_text` LONGTEXT NOT NULL,
  `is_escalation` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_session` (`session_id`),
  KEY `idx_ai_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 17. PARTIES & PARTY TRANSACTIONS (UNIFIED KHATA ENGINE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_parties` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(64) NOT NULL DEFAULT 'customer',
  `phone` VARCHAR(64) NULL,
  `city` VARCHAR(128) NULL DEFAULT 'Lahore',
  `address` TEXT NULL,
  `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `credit_limit` DECIMAL(12,2) NOT NULL DEFAULT 100000.00,
  `status` VARCHAR(32) NOT NULL DEFAULT 'Active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mbiparty_tenant` (`tenant_id`),
  KEY `idx_mbiparty_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_party_transactions` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `party_id` VARCHAR(128) NOT NULL,
  `reference_id` VARCHAR(128) NULL,
  `transaction_type` VARCHAR(64) NOT NULL DEFAULT 'SALE',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `debit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `credit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `running_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_partytrx_tenant` (`tenant_id`),
  KEY `idx_partytrx_party` (`party_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 18. CHECKOUT ORDERS & PROMOTIONAL COUPONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_checkout_orders` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `business_name` VARCHAR(255) NOT NULL,
  `owner_name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(128) NULL,
  `whatsapp` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) NULL,
  `city` VARCHAR(128) NULL DEFAULT 'Lahore',
  `plan_id` VARCHAR(64) NOT NULL DEFAULT 'business',
  `plan_name` VARCHAR(128) NOT NULL DEFAULT 'Gold Business',
  `billing_interval` VARCHAR(32) NOT NULL DEFAULT '1year',
  `amount_rupees` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(64) NOT NULL DEFAULT 'Meezan Bank',
  `trx_id` VARCHAR(128) NULL,
  `payment_screenshot` LONGTEXT NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chk_tenant` (`tenant_id`),
  KEY `idx_chk_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_promotional_coupons` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL DEFAULT 'global',
  `code` VARCHAR(64) NOT NULL,
  `discount_type` VARCHAR(32) NOT NULL DEFAULT 'PERCENT',
  `discount_value` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `min_order_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `max_discount_cap` DECIMAL(10,2) NULL,
  `expiry_date` DATE NOT NULL,
  `usage_limit` INT NOT NULL DEFAULT 100,
  `times_used` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_coupon_tenant` (`tenant_id`),
  KEY `idx_coupon_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 19. BROADCASTS & DATABASE BACKUPS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_broadcasts` (
  `id` VARCHAR(128) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` LONGTEXT NOT NULL,
  `target_scope` VARCHAR(64) NOT NULL DEFAULT 'ALL',
  `target_tenant_id` VARCHAR(128) NULL,
  `priority` VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
  `created_by` VARCHAR(128) NOT NULL DEFAULT 'Master Admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mbi_database_backups` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL DEFAULT 'global',
  `filename` VARCHAR(255) NOT NULL,
  `file_size_bytes` BIGINT NOT NULL DEFAULT 0,
  `backup_type` VARCHAR(64) NOT NULL DEFAULT 'AUTOMATED_MIDNIGHT',
  `record_count` INT NOT NULL DEFAULT 0,
  `checksum_sha256` VARCHAR(128) NULL,
  `storage_location` VARCHAR(255) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_backup_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED ESSENTIAL MASTER DEFAULT DATA
-- ============================================================================
INSERT INTO `mbi_plans` (`id`, `name`, `tier`, `price_monthly`, `price_yearly`, `max_users`, `max_branches`, `max_devices`, `max_terminals`, `storage_limit_mb`) VALUES
('basic', 'MBI Silver (Basic Retail)', 'Basic', 2500.00, 25000.00, 2, 1, 2, 2, 5000),
('business', 'MBI Gold (Business Wholesale)', 'Gold', 4500.00, 45000.00, 5, 3, 5, 5, 15000),
('enterprise', 'MBI Platinum (Enterprise Fleet)', 'Platinum', 8500.00, 85000.00, 20, 10, 20, 20, 50000)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `mbi_settings` (`setting_key`, `setting_value`) VALUES
('app_version', '4.3.0'),
('system_mode', 'PRODUCTION'),
('hotline_1', '0328-1302636'),
('hotline_2', '0336-4585863')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;
-- ==============================================================================
-- SUCCESS: MBI INVENTRA MASTER DDL & MULTI-TENANT SEED COMPLETE
-- ==============================================================================
