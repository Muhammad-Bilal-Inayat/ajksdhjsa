-- ==============================================================================
-- MBI INVENTRA — MARIADB 10.x / 11.x HIGH-FREQUENCY OPTIMIZED MIGRATION SCRIPT
-- Target: High-Frequency Inventory Lookups, FEFO Batch Selection & Unlimited POS Billing
-- ==============================================================================

USE `mbi_inventra`;

-- 1. High-Frequency Medicine Catalog Indexes (Instant Barcode Scanner & Search)
ALTER TABLE `mbi_medicines`
  ADD INDEX IF NOT EXISTS `idx_med_tenant_barcode` (`tenant_id`, `barcode`),
  ADD INDEX IF NOT EXISTS `idx_med_tenant_name` (`tenant_id`, `name`),
  ADD INDEX IF NOT EXISTS `idx_med_tenant_generic` (`tenant_id`, `generic_salt`),
  ADD INDEX IF NOT EXISTS `idx_med_tenant_company` (`tenant_id`, `company`);

-- 2. FEFO Batch Selection & Real-Time Stock Availability Indexes
ALTER TABLE `mbi_inventory_batches`
  ADD INDEX IF NOT EXISTS `idx_batch_fefo_turbo` (`tenant_id`, `medicine_id`, `expiry_date`, `current_stock_quantity`),
  ADD INDEX IF NOT EXISTS `idx_batch_barcode_lookup` (`tenant_id`, `batch_number`),
  ADD INDEX IF NOT EXISTS `idx_batch_expiry_alert` (`tenant_id`, `expiry_date`, `is_expired_blocked`);

-- 3. Unlimited Billing & High-Throughput POS Invoicing Indexes
ALTER TABLE `mbi_invoices`
  ADD INDEX IF NOT EXISTS `idx_inv_tenant_date_perf` (`tenant_id`, `date`),
  ADD INDEX IF NOT EXISTS `idx_inv_tenant_number` (`tenant_id`, `invoice_number`),
  ADD INDEX IF NOT EXISTS `idx_inv_tenant_customer` (`tenant_id`, `customer_id`, `date`),
  ADD INDEX IF NOT EXISTS `idx_inv_tenant_cashier` (`tenant_id`, `cashier_id`, `date`),
  ADD INDEX IF NOT EXISTS `idx_inv_status_payment` (`tenant_id`, `payment_status`, `payment_method`);

-- 4. Fast Itemized Billing & Sales Audit Trail Indexes
ALTER TABLE `mbi_invoice_items`
  ADD INDEX IF NOT EXISTS `idx_inv_items_fast_lookup` (`invoice_id`, `medicine_id`),
  ADD INDEX IF NOT EXISTS `idx_inv_items_tenant_med` (`tenant_id`, `medicine_id`, `created_at`),
  ADD INDEX IF NOT EXISTS `idx_inv_items_batch` (`tenant_id`, `batch_number`, `expiry_date`);

-- 5. Customer & Supplier Khata Ledger Indexes (High-Speed Double Entry)
ALTER TABLE `mbi_party_transactions`
  ADD INDEX IF NOT EXISTS `idx_party_tx_ledger_stream` (`tenant_id`, `party_id`, `date`, `id`),
  ADD INDEX IF NOT EXISTS `idx_party_tx_reference` (`tenant_id`, `reference_id`),
  ADD INDEX IF NOT EXISTS `idx_party_tx_type_date` (`tenant_id`, `type`, `date`);

ALTER TABLE `mbi_parties`
  ADD INDEX IF NOT EXISTS `idx_party_tenant_type_name` (`tenant_id`, `type`, `name`),
  ADD INDEX IF NOT EXISTS `idx_party_tenant_phone` (`tenant_id`, `phone`),
  ADD INDEX IF NOT EXISTS `idx_party_balance_audit` (`tenant_id`, `current_balance`);

-- 6. Cashier Shifts & Register Closing Indexes
ALTER TABLE `mbi_cashier_shifts`
  ADD INDEX IF NOT EXISTS `idx_shift_tenant_status` (`tenant_id`, `status`, `opened_at`),
  ADD INDEX IF NOT EXISTS `idx_shift_user_active` (`tenant_id`, `user_id`, `status`);
