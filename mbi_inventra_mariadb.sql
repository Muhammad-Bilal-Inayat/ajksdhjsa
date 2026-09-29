-- ==============================================================================
-- MBI INVENTRA 4 — ENTERPRISE ZERO-CONFLICT DATABASE SCHEMA (23 TABLES)
-- Target Database: mbi72dn (MARIADB 10.x / 11.x)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `mbi72dn` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `mbi72dn`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- 1. SaaS Subscription Plans
CREATE TABLE IF NOT EXISTS `mbi_plans` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `tier` VARCHAR(32) NOT NULL DEFAULT 'Basic',
    `monthly_price_pkr` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `annual_price_pkr` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `max_users` INT NOT NULL DEFAULT 5,
    `max_branches` INT NOT NULL DEFAULT 1,
    `max_devices` INT NOT NULL DEFAULT 3,
    `features` LONGTEXT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Multi-Tenant Organizations & Stores
CREATE TABLE IF NOT EXISTS `mbi_tenants` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `legal_name` VARCHAR(255) NULL,
    `owner_name` VARCHAR(255) NOT NULL,
    `owner_email` VARCHAR(255) NOT NULL,
    `owner_phone` VARCHAR(64) NOT NULL,
    `city` VARCHAR(100) NULL DEFAULT 'Lahore',
    `address` TEXT NULL,
    `drug_license_no` VARCHAR(100) NULL,
    `tax_ntn_number` VARCHAR(100) NULL,
    `plan_id` VARCHAR(64) NOT NULL DEFAULT 'Basic',
    `status` VARCHAR(32) NOT NULL DEFAULT 'Active',
    `app_version` VARCHAR(32) NOT NULL DEFAULT 'v4.2.0',
    `max_users` INT NOT NULL DEFAULT 5,
    `max_devices` INT NOT NULL DEFAULT 3,
    `storage_limit_mb` INT NOT NULL DEFAULT 500,
    `storage_used_mb` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `last_sync_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    KEY `idx_tenant_status` (`status`),
    KEY `idx_tenant_owner_email` (`owner_email`),
    KEY `idx_tenant_org` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Staff Accounts & Passcodes
CREATE TABLE IF NOT EXISTS `mbi_users` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email_or_phone` VARCHAR(255) NOT NULL,
    `passcode` VARCHAR(255) NOT NULL DEFAULT '0000',
    `role` VARCHAR(64) NOT NULL DEFAULT 'Cashier',
    `status` VARCHAR(32) NOT NULL DEFAULT 'Active',
    `is_online` TINYINT(1) NOT NULL DEFAULT 0,
    `can_edit_bill` TINYINT(1) NOT NULL DEFAULT 0,
    `is_silent_monitored` TINYINT(1) NOT NULL DEFAULT 0,
    `is_kill_switch_active` TINYINT(1) NOT NULL DEFAULT 0,
    `allowed_modules` LONGTEXT NULL,
    `totp_secret` VARCHAR(128) NULL,
    `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `last_login_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_tenant` (`tenant_id`),
    KEY `idx_user_auth` (`tenant_id`, `email_or_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Registration Leads
CREATE TABLE IF NOT EXISTS `mbi_registration_leads` (
    `id` VARCHAR(64) NOT NULL,
    `store_name` VARCHAR(255) NOT NULL,
    `owner_name` VARCHAR(255) NOT NULL,
    `username` VARCHAR(128) NULL,
    `phone` VARCHAR(64) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `city` VARCHAR(100) NULL DEFAULT 'Lahore',
    `address` TEXT NULL,
    `drug_license_no` VARCHAR(100) NULL,
    `ntn_number` VARCHAR(100) NULL,
    `requested_plan` VARCHAR(100) NOT NULL DEFAULT 'Basic (10-Day Free Trial)',
    `status` VARCHAR(32) NOT NULL DEFAULT 'activated',
    `is_approved` TINYINT(1) NOT NULL DEFAULT 1,
    `activation_key` VARCHAR(128) NULL,
    `notes` TEXT NULL,
    `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `activated_at` DATETIME NULL,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_lead_phone` (`phone`),
    KEY `idx_lead_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Hardware Licenses
CREATE TABLE IF NOT EXISTS `mbi_licenses` (
    `id` VARCHAR(64) NOT NULL,
    `license_key` VARCHAR(128) NOT NULL,
    `client_name` VARCHAR(255) NOT NULL,
    `owner_name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(64) NOT NULL,
    `city` VARCHAR(100) NULL DEFAULT 'Lahore',
    `plan` VARCHAR(64) NOT NULL DEFAULT 'Basic',
    `status` VARCHAR(32) NOT NULL DEFAULT 'Active',
    `issue_date` DATE NOT NULL,
    `expiry_date` DATE NOT NULL,
    `max_devices` INT NOT NULL DEFAULT 5,
    `sale_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `amount_paid` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `amount_due` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `bound_hardware_ids` LONGTEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_license_key` (`license_key`),
    KEY `idx_license_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Medicine Master Catalog
CREATE TABLE IF NOT EXISTS `mbi_medicines` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'global',
    `name` VARCHAR(255) NOT NULL,
    `generic_salt` VARCHAR(255) NULL,
    `company` VARCHAR(255) NULL,
    `category` VARCHAR(100) NULL DEFAULT 'General Medicine',
    `dosage_form` VARCHAR(100) NULL DEFAULT 'Tablet',
    `strength` VARCHAR(100) NULL,
    `barcode` VARCHAR(128) NULL,
    `sku` VARCHAR(128) NULL,
    `is_narcotic` TINYINT(1) NOT NULL DEFAULT 0,
    `is_prescription_required` TINYINT(1) NOT NULL DEFAULT 0,
    `min_stock_level` INT NOT NULL DEFAULT 5,
    `pack_size` INT NOT NULL DEFAULT 1,
    `shelf_rack_location` VARCHAR(100) NULL,
    `version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_med_tenant` (`tenant_id`),
    KEY `idx_med_tenant_barcode` (`tenant_id`, `barcode`),
    KEY `idx_med_tenant_name` (`tenant_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. FEFO Inventory Batches
CREATE TABLE IF NOT EXISTS `mbi_inventory_batches` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `medicine_id` VARCHAR(64) NOT NULL,
    `batch_number` VARCHAR(128) NOT NULL,
    `expiry_date` DATE NOT NULL,
    `purchase_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `mrp_selling_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `current_stock_quantity` INT NOT NULL DEFAULT 0,
    `supplier_id` VARCHAR(64) NULL,
    `godown_location` VARCHAR(100) NULL DEFAULT 'Main Store',
    `version` BIGINT NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_batch_tenant` (`tenant_id`),
    KEY `idx_batch_med` (`tenant_id`, `medicine_id`),
    KEY `idx_batch_expiry` (`tenant_id`, `expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Sales POS Invoices (Zero-Conflict Idempotent)
CREATE TABLE IF NOT EXISTS `mbi_invoices` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `device_id` VARCHAR(64) NOT NULL DEFAULT 'device-1',
    `invoice_number` VARCHAR(100) NOT NULL,
    `idempotency_key` VARCHAR(128) NOT NULL,
    `customer_name` VARCHAR(255) NULL DEFAULT 'Walk-in Customer',
    `customer_phone` VARCHAR(64) NULL,
    `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `sub_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `received_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `balance_due` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `payment_method` VARCHAR(64) NOT NULL DEFAULT 'Cash',
    `cashier_name` VARCHAR(255) NULL,
    `is_voided` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_inv_idempotency` (`tenant_id`, `idempotency_key`),
    KEY `idx_inv_tenant_date` (`tenant_id`, `date`),
    KEY `idx_inv_tenant_number` (`tenant_id`, `invoice_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Sold Medicine Lines
CREATE TABLE IF NOT EXISTS `mbi_invoice_items` (
    `id` VARCHAR(64) NOT NULL,
    `invoice_id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `medicine_id` VARCHAR(64) NULL,
    `medicine_name` VARCHAR(255) NOT NULL,
    `batch_number` VARCHAR(128) NULL,
    `expiry_date` DATE NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `unit` VARCHAR(32) NOT NULL DEFAULT 'Pcs',
    `selling_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `purchase_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (`id`),
    KEY `idx_item_inv` (`invoice_id`),
    KEY `idx_item_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Purchases & GRN
CREATE TABLE IF NOT EXISTS `mbi_purchases` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `purchase_number` VARCHAR(100) NOT NULL,
    `supplier_id` VARCHAR(64) NULL,
    `supplier_name` VARCHAR(255) NOT NULL,
    `bill_date` DATE NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `balance_due` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `payment_mode` VARCHAR(64) NOT NULL DEFAULT 'Cash',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_pur_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Parties Khatas
CREATE TABLE IF NOT EXISTS `mbi_parties` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(32) NOT NULL DEFAULT 'Customer',
    `phone` VARCHAR(64) NULL,
    `email` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL DEFAULT 'Lahore',
    `address` TEXT NULL,
    `credit_limit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `current_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_party_tenant` (`tenant_id`),
    KEY `idx_party_type` (`tenant_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Party Transactions
CREATE TABLE IF NOT EXISTS `mbi_party_transactions` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `party_id` VARCHAR(64) NOT NULL,
    `transaction_type` VARCHAR(32) NOT NULL DEFAULT 'DEBIT',
    `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `balance_after` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `reference_id` VARCHAR(100) NULL,
    `description` VARCHAR(255) NULL,
    `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_pt_party` (`party_id`),
    KEY `idx_pt_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Cashier Shifts
CREATE TABLE IF NOT EXISTS `mbi_cashier_shifts` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `cashier_id` VARCHAR(64) NOT NULL,
    `cashier_name` VARCHAR(255) NOT NULL,
    `opening_cash` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `closing_cash` DECIMAL(12, 2) NULL,
    `expected_cash` DECIMAL(12, 2) NULL,
    `difference` DECIMAL(12, 2) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'Open',
    `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `closed_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    KEY `idx_shift_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Print Templates
CREATE TABLE IF NOT EXISTS `mbi_print_templates` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'global',
    `printer_type` VARCHAR(32) NOT NULL DEFAULT 'THERMAL',
    `active_theme` VARCHAR(100) NOT NULL DEFAULT 'THERMAL_MBI_STANDARD',
    `brand_name` VARCHAR(255) NOT NULL DEFAULT 'MBI INVENTRA 4',
    `subtitle` VARCHAR(255) NOT NULL DEFAULT 'PHARMACY POS & ERP',
    `phone_numbers` VARCHAR(255) NOT NULL DEFAULT '03364585863 • 03281302636',
    `country_city` VARCHAR(255) NOT NULL DEFAULT 'Pakistan',
    `footer_title` VARCHAR(255) NOT NULL DEFAULT 'THANK YOU FOR SHOPPING!',
    `footer_contact` VARCHAR(255) NOT NULL DEFAULT 'Contact us : 03281302636',
    `footer_website` VARCHAR(255) NOT NULL DEFAULT 'Pharmacy POS & ERP    www.mbiinventra.com',
    `compact_footer` TINYINT(1) NOT NULL DEFAULT 1,
    `is_client_locked` TINYINT(1) NOT NULL DEFAULT 1,
    `a4_drug_warranty` TEXT NULL,
    `a4_bank_details` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_print_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS `mbi_audit_logs` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NULL,
    `user_name` VARCHAR(255) NULL,
    `action` VARCHAR(128) NOT NULL,
    `category` VARCHAR(64) NOT NULL DEFAULT 'SECURITY',
    `details` TEXT NULL,
    `ip_address` VARCHAR(64) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_audit_tenant` (`tenant_id`),
    KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Expenses
CREATE TABLE IF NOT EXISTS `mbi_expenses` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'General',
    `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `payment_method` VARCHAR(64) NOT NULL DEFAULT 'Cash',
    `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_exp_tenant_date` (`tenant_id`, `date`),
    KEY `idx_exp_category` (`tenant_id`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Online Store Checkout Orders
CREATE TABLE IF NOT EXISTS `mbi_checkout_orders` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `order_number` VARCHAR(100) NOT NULL,
    `customer_name` VARCHAR(255) NOT NULL,
    `customer_phone` VARCHAR(64) NOT NULL,
    `customer_email` VARCHAR(255) NULL,
    `shipping_address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL DEFAULT 'Lahore',
    `items_json` LONGTEXT NOT NULL,
    `sub_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `shipping_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `payment_method` VARCHAR(64) NOT NULL DEFAULT 'COD',
    `payment_status` VARCHAR(32) NOT NULL DEFAULT 'Unpaid',
    `order_status` VARCHAR(32) NOT NULL DEFAULT 'Pending',
    `prescription_url` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_order_tenant` (`tenant_id`),
    KEY `idx_order_number` (`order_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Settings
CREATE TABLE IF NOT EXISTS `mbi_settings` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'global',
    `company_name` VARCHAR(255) NOT NULL DEFAULT 'MBI INVENTRA 4',
    `tagline` VARCHAR(255) NULL,
    `phone` VARCHAR(64) NULL,
    `email` VARCHAR(255) NULL,
    `address` TEXT NULL,
    `currency` VARCHAR(16) NOT NULL DEFAULT 'PKR',
    `invoice_prefix` VARCHAR(32) NOT NULL DEFAULT 'INV-',
    `tax_rate_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `settings_json` LONGTEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_setting_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Stock Transfers
CREATE TABLE IF NOT EXISTS `mbi_stock_transfers` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
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

-- 20. Doctor Prescriptions
CREATE TABLE IF NOT EXISTS `mbi_prescriptions` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `prescription_number` VARCHAR(100) NOT NULL,
    `doctor_name` VARCHAR(255) NOT NULL,
    `doctor_pmdc_no` VARCHAR(100) NULL,
    `patient_name` VARCHAR(255) NOT NULL,
    `patient_age` INT NULL,
    `patient_gender` VARCHAR(16) NULL DEFAULT 'Male',
    `patient_phone` VARCHAR(64) NULL,
    `patient_cnic` VARCHAR(64) NULL,
    `invoice_id` VARCHAR(64) NULL,
    `prescribed_items` LONGTEXT NULL,
    `prescription_image_url` TEXT NULL,
    `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_presc_tenant` (`tenant_id`),
    KEY `idx_presc_invoice` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Supplier Returns
CREATE TABLE IF NOT EXISTS `mbi_supplier_returns` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `debit_note_number` VARCHAR(100) NOT NULL,
    `supplier_id` VARCHAR(64) NOT NULL,
    `supplier_name` VARCHAR(255) NOT NULL,
    `return_date` DATE NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `reason` VARCHAR(255) NOT NULL DEFAULT 'Near Expiry / Expired',
    `status` VARCHAR(32) NOT NULL DEFAULT 'Processed',
    `items_json` LONGTEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_sreturn_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Discount Coupons
CREATE TABLE IF NOT EXISTS `mbi_promotional_coupons` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'global',
    `code` VARCHAR(64) NOT NULL,
    `discount_type` VARCHAR(32) NOT NULL DEFAULT 'PERCENT',
    `discount_value` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `min_order_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `max_discount_cap` DECIMAL(10, 2) NULL,
    `expiry_date` DATE NOT NULL,
    `usage_limit` INT NOT NULL DEFAULT 100,
    `times_used` INT NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_coupon_code` (`tenant_id`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. WhatsApp Dispatch Queue
CREATE TABLE IF NOT EXISTS `mbi_notifications` (
    `id` VARCHAR(64) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL,
    `recipient_phone` VARCHAR(64) NOT NULL,
    `recipient_name` VARCHAR(255) NULL,
    `notification_type` VARCHAR(64) NOT NULL DEFAULT 'WHATSAPP_INVOICE',
    `message_body` TEXT NOT NULL,
    `media_url` TEXT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'Sent',
    `scheduled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `sent_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_notif_tenant` (`tenant_id`),
    KEY `idx_notif_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plans Seed Data
INSERT INTO `mbi_plans` (`id`, `name`, `tier`, `monthly_price_pkr`, `annual_price_pkr`, `max_users`, `max_branches`, `max_devices`, `features`) 
VALUES
('Basic', 'MBI Silver (Basic Retail)', 'Basic', 2500.00, 25000.00, 2, 1, 2, '{"posBilling": true, "barcodeScanner": true, "khataLedgers": true, "offlineMode": true}'),
('Business', 'MBI Gold (Business Wholesale)', 'Business', 4500.00, 45000.00, 5, 2, 5, '{"posBilling": true, "fefoBatches": true, "godowns": true, "purchaseOrders": true}'),
('Enterprise', 'MBI Platinum (Enterprise Fleet)', 'Enterprise', 8500.00, 85000.00, 20, 10, 20, '{"posBilling": true, "fefoBatches": true, "onlineStore": true, "auditTrail": true}')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;
