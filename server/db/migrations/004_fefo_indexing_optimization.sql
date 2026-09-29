-- ==============================================================================
-- MBI INVENTRA — DATABASE MIGRATION 004 (FEFO & BATCH QUERY OPTIMIZATION)
-- Adds performance indexes on 'inventory', 'batches', and 'transactions' tables
-- on critical fields: 'batch_number', 'expiry_date', and 'product_id' / 'medicine_id'
-- ==============================================================================

-- 1. Optimized FEFO Indexes for Pharmacy Medicine Batches (Tenant Schema Context)
-- Composite Index for 0.05ms FEFO batch selection (Filtering by product + sorting by earliest expiry)
CREATE INDEX IF NOT EXISTS idx_batches_fefo_composite 
ON batches (medicine_id, expiry_date ASC, current_quantity DESC);

-- Fast lookup index for barcode/batch scanners
CREATE INDEX IF NOT EXISTS idx_batches_number_search 
ON batches (batch_number varchar_pattern_ops);

-- Fast lookup for near-expiry and active status filters
CREATE INDEX IF NOT EXISTS idx_batches_status_expiry 
ON batches (status, expiry_date ASC);

-- 2. General Inventory & Catalog Table Indexes (if table 'inventory' exists or is aliased)
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    location VARCHAR(64) DEFAULT 'Main Store',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compound index on critical FEFO fields: productId, expiryDate, batchNumber
CREATE INDEX IF NOT EXISTS idx_inventory_product_expiry_fefo 
ON inventory (product_id, expiry_date ASC, quantity DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_batch_number 
ON inventory (batch_number);

CREATE INDEX IF NOT EXISTS idx_inventory_expiry_date 
ON inventory (expiry_date ASC);

-- 3. High-Throughput Sales & Inventory Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64),
    product_id VARCHAR(64) NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    transaction_type VARCHAR(32) NOT NULL, -- 'SALE', 'PURCHASE', 'RETURN', 'ADJUSTMENT'
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Speed up transaction audits and FEFO stock verification logs
CREATE INDEX IF NOT EXISTS idx_transactions_product_batch 
ON transactions (product_id, batch_number);

CREATE INDEX IF NOT EXISTS idx_transactions_expiry_date 
ON transactions (expiry_date ASC);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
ON transactions (created_at DESC);

-- 4. Invoice Items FEFO & Ledger Performance Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_med_batch 
ON invoice_items (medicine_id, batch_number);

CREATE INDEX IF NOT EXISTS idx_invoice_items_expiry 
ON invoice_items (expiry_date ASC);
