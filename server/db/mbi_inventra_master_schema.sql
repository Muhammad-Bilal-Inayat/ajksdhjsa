-- ============================================================================
-- MBI INVENTRA - ENTERPRISE MULTI-TENANT MARIADB / PHPMYADMIN MASTER SCHEMA
-- Complete DDL for All 25 Core Tables, Indices, Foreign Keys & Default Seeding
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
-- Compatible with: MariaDB 10.5+, MySQL 8.0+, phpMyAdmin 5.x+
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ----------------------------------------------------------------------------
-- 1. PLANS & TIERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_plans` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `tier` ENUM('Basic', 'Silver', 'Gold', 'Platinum', 'Enterprise') NOT NULL DEFAULT 'Basic',
  `price_monthly` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `price_yearly` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `max_terminals` INT NOT NULL DEFAULT 2,
  `storage_limit_mb` INT NOT NULL DEFAULT 5000,
  `features_json` LONGTEXT NULL,
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
  `owner_name` VARCHAR(255) NOT NULL DEFAULT 'Store Owner',
  `owner_phone` VARCHAR(64) NOT NULL DEFAULT '',
  `owner_email` VARCHAR(255) NULL,
  `contact_phone` VARCHAR(64) NULL,
  `contact_email` VARCHAR(255) NULL,
  `city` VARCHAR(128) NOT NULL DEFAULT 'Lahore',
  `address` TEXT NULL,
  `drug_license_no` VARCHAR(128) NULL,
  `ntn_number` VARCHAR(64) NULL,
  `plan` VARCHAR(64) NOT NULL DEFAULT 'Basic',
  `plan_id` VARCHAR(64) NOT NULL DEFAULT 'Basic',
  `status` ENUM('Active', 'Trial', 'Expiring', 'Suspended', 'Locked', 'Archived') NOT NULL DEFAULT 'Active',
  `subscription_plan` VARCHAR(64) NOT NULL DEFAULT 'Basic',
  `subscription_status` VARCHAR(64) NOT NULL DEFAULT 'Active',
  `storage_limit_mb` INT NOT NULL DEFAULT 5000,
  `storage_used_mb` INT NOT NULL DEFAULT 0,
  `app_version` VARCHAR(32) NOT NULL DEFAULT '4.2.0',
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
  KEY `idx_tenant_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. USERS & STAFF GOVERNANCE
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
  `role` VARCHAR(64) NOT NULL DEFAULT 'Owner',
  `is_primary_owner` TINYINT(1) NOT NULL DEFAULT 0,
  `is_primary_admin` TINYINT(1) NOT NULL DEFAULT 0,
  `is_online` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('Active', 'Joined', 'Disabled', 'Suspended') NOT NULL DEFAULT 'Active',
  `is_kill_switch_active` TINYINT(1) NOT NULL DEFAULT 0,
  `allowed_modules` LONGTEXT NULL,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_tenant` (`tenant_id`),
  KEY `idx_user_lookup` (`email_or_phone`, `username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. LICENSES & HARDWARE HWID VAULT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_licenses` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NULL,
  `license_key` VARCHAR(128) NOT NULL,
  `client_name` VARCHAR(255) NOT NULL DEFAULT 'Pharmacy Store',
  `owner_name` VARCHAR(255) NOT NULL DEFAULT 'Store Owner',
  `phone` VARCHAR(64) NOT NULL DEFAULT '',
  `city` VARCHAR(128) NOT NULL DEFAULT 'Lahore',
  `plan` VARCHAR(64) NOT NULL DEFAULT 'Basic',
  `status` ENUM('Active', 'Trial', 'Suspended', 'Expired', 'Revoked') NOT NULL DEFAULT 'Active',
  `issue_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `expires_at` DATETIME NULL,
  `max_devices` INT NOT NULL DEFAULT 10,
  `max_terminals` INT NOT NULL DEFAULT 10,
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
  KEY `idx_lic_hwid` (`bound_hwid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. REGISTRATION LEADS (WHATSAPP CRM)
-- ----------------------------------------------------------------------------
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
  `status` ENUM('pending_activation', 'contacted', 'activated', 'rejected') NOT NULL DEFAULT 'activated',
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
-- 6. FLEET HARDWARE DEVICES
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
  `status` ENUM('Active', 'Pending_Authorization', 'Revoked', 'Replaced', 'Disabled') NOT NULL DEFAULT 'Active',
  `first_authorized_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_device_tenant` (`tenant_id`),
  KEY `idx_device_hwid` (`hwid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. MEDICINE CATALOG
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
  KEY `idx_med_tenant` (`tenant_id`),
  KEY `idx_med_barcode` (`barcode`),
  KEY `idx_med_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. INVENTORY BATCHES (FEFO ENGINE)
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
-- 9. POS INVOICES
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

-- ----------------------------------------------------------------------------
-- 10. INVOICE LINE ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_invoice_items` (
  `id` VARCHAR(128) NOT NULL,
  `invoice_id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `medicine_id` VARCHAR(128) NULL,
  `medicine_name` VARCHAR(255) NOT NULL,
  `batch_number` VARCHAR(128) NULL,
  `expiry_date` DATE NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit` VARCHAR(32) NOT NULL DEFAULT 'Pcs',
  `selling_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_item_invoice` (`invoice_id`),
  KEY `idx_item_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. PURCHASES (STOCK INWARD)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_purchases` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `bill_number` VARCHAR(128) NOT NULL,
  `supplier_name` VARCHAR(255) NOT NULL,
  `supplier_phone` VARCHAR(64) NULL,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `balance_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `purchase_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pur_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. PARTIES & CUSTOMERS (KHATA / LEDGER)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_parties` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('Customer', 'Supplier', 'Both') NOT NULL DEFAULT 'Customer',
  `phone` VARCHAR(64) NULL,
  `city` VARCHAR(128) NULL,
  `address` TEXT NULL,
  `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_party_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. CASHIER SHIFTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_cashier_shifts` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(128) NOT NULL,
  `user_name` VARCHAR(255) NOT NULL,
  `opening_cash` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `closing_cash` DECIMAL(12,2) NULL,
  `expected_cash` DECIMAL(12,2) NULL,
  `difference` DECIMAL(12,2) NULL,
  `opened_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` DATETIME NULL,
  `status` ENUM('Open', 'Closed') NOT NULL DEFAULT 'Open',
  PRIMARY KEY (`id`),
  KEY `idx_shift_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. EXPENSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_expenses` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(128) NOT NULL DEFAULT 'General',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(64) NOT NULL DEFAULT 'Cash',
  `recorded_by` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exp_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 15. PRINT TEMPLATES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_print_templates` (
  `id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(128) NOT NULL,
  `printer_type` VARCHAR(64) NOT NULL DEFAULT 'thermal_80mm',
  `active_theme` VARCHAR(64) NOT NULL DEFAULT 'classic',
  `brand_name` VARCHAR(255) NOT NULL DEFAULT 'MBI INVENTRA PHARMACY',
  `subtitle` VARCHAR(255) NULL,
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

-- ----------------------------------------------------------------------------
-- 16. SECURITY AUDIT LOGS
-- ----------------------------------------------------------------------------
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
-- 17. NOTIFICATIONS & BROADCASTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_notifications` (
  `id` VARCHAR(128) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` LONGTEXT NOT NULL,
  `target_scope` VARCHAR(64) NOT NULL DEFAULT 'ALL',
  `target_tenant_id` VARCHAR(128) NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'SYSTEM_UPDATE',
  `priority` VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
  `created_by` VARCHAR(128) NOT NULL DEFAULT 'Master Admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 18. AI TELEMETRY & CHAT HISTORY
-- ----------------------------------------------------------------------------
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
-- 19. SETTINGS & SYSTEM FLAGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `mbi_settings` (
  `setting_key` VARCHAR(128) NOT NULL,
  `setting_value` LONGTEXT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED ESSENTIAL MASTER DEFAULT DATA
-- ============================================================================
INSERT INTO `mbi_plans` (`id`, `name`, `tier`, `price_monthly`, `price_yearly`, `max_terminals`, `storage_limit_mb`) VALUES
('basic_monthly', 'Basic Plan (Silver)', 'Basic', 2500.00, 25000.00, 2, 5000),
('pro_monthly', 'Pharmacy Pro (Gold)', 'Gold', 4500.00, 45000.00, 5, 15000),
('enterprise_yearly', 'Enterprise Multi-Branch (Platinum)', 'Platinum', 8500.00, 85000.00, 15, 50000)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `mbi_settings` (`setting_key`, `setting_value`) VALUES
('app_version', '4.2.0'),
('system_mode', 'PRODUCTION'),
('hotline_1', '0328-1302636'),
('hotline_2', '0336-4585863')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;
-- ============================================================================
-- SUCCESS: MBI INVENTRA MASTER DDL & SEED COMPLETE
-- ============================================================================
