-- ==============================================================================
-- MBI INVENTRA — POSTGRESQL TENANT TEMPLATE DDL (002_tenant_template_schema.sql)
-- Isolated Business Schema for a Company (Runs inside schema: tenant_{tenant_id})
-- ==============================================================================

-- 1. Medicines & Pharmacy Products Catalog
CREATE TABLE IF NOT EXISTS medicines (
    id VARCHAR(64) PRIMARY KEY,
    firm_id VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    generic_formula VARCHAR(255),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    item_code VARCHAR(64),
    barcode VARCHAR(64),
    qr_code VARCHAR(128),
    manufacturer VARCHAR(255),
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    retail_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    sales_tax_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pack_size NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit VARCHAR(32) NOT NULL DEFAULT 'Pcs',
    min_stock_alert NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    location_shelf VARCHAR(64),
    warehouse_godown VARCHAR(64) DEFAULT 'Main Store',
    is_narcotic BOOLEAN NOT NULL DEFAULT FALSE,
    is_prescription_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_store_visible BOOLEAN NOT NULL DEFAULT FALSE,
    image_url TEXT,
    created_by VARCHAR(64),
    updated_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_barcode ON medicines(barcode);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_stock ON medicines(stock_quantity);

-- 2. Batches & Expiry (FEFO Engine Support)
CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(64) PRIMARY KEY,
    medicine_id VARCHAR(64) NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    manufacture_date DATE,
    purchase_date DATE,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    retail_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    initial_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    warehouse_godown VARCHAR(64) DEFAULT 'Main Store',
    shelf_location VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'NearExpiry', 'Expired', 'Depleted', 'Quarantined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_med_expiry ON batches(medicine_id, expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_batches_number ON batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);

-- 3. Suppliers & Distributors
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(64) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Positive = Payable
    payment_terms_days INT NOT NULL DEFAULT 30,
    tax_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);

-- 4. Loyalty Customers & Patients
CREATE TABLE IF NOT EXISTS loyalty_customers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Positive = Receivable
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    points INT NOT NULL DEFAULT 0,
    membership_tier VARCHAR(32) DEFAULT 'Regular',
    prescriptions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON loyalty_customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON loyalty_customers(name);

-- 5. Invoices & POS Sales
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(64) NOT NULL UNIQUE,
    firm_id VARCHAR(64),
    customer_id VARCHAR(64) REFERENCES loyalty_customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(64),
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    change_returned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'Cash',
    order_type VARCHAR(32) NOT NULL DEFAULT 'Retail POS',
    status VARCHAR(32) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Refunded', 'PartialRefund', 'Draft', 'Cancelled', 'OnHold')),
    cashier_shift_id VARCHAR(64),
    biller_user_id VARCHAR(64) NOT NULL,
    biller_user_name VARCHAR(255) NOT NULL,
    device_id VARCHAR(128),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    refund_details JSONB,
    doctor_name VARCHAR(255),
    notes TEXT,
    is_synced BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_biller ON invoices(biller_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

-- 6. Purchases & Inward Goods Receipts
CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(64) PRIMARY KEY,
    purchase_number VARCHAR(64) NOT NULL UNIQUE,
    supplier_bill_number VARCHAR(64),
    firm_id VARCHAR(64),
    supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(255) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_payable NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'Credit',
    status VARCHAR(32) NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'Pending', 'Draft', 'Returned', 'Partial')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    received_by_user_id VARCHAR(64),
    received_by_user_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_number ON purchases(purchase_number);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);

-- 7. Stock Movements (Complete Audit Ledger of Inventory Flow)
CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(64) PRIMARY KEY,
    medicine_id VARCHAR(64) NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    batch_id VARCHAR(64),
    movement_type VARCHAR(32) NOT NULL CHECK (movement_type IN ('SALE', 'SALE_RETURN', 'PURCHASE', 'PURCHASE_RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'GODOWN_TRANSFER', 'DAMAGE_EXPIRED')),
    reference_id VARCHAR(64), -- invoice_id, purchase_id, etc.
    quantity_change NUMERIC(12, 2) NOT NULL,
    previous_stock NUMERIC(12, 2) NOT NULL,
    new_stock NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(12, 2),
    reason TEXT,
    performed_by_user_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_med ON stock_movements(medicine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

-- 8. Ledgers (Party & General Ledger Entries)
CREATE TABLE IF NOT EXISTS ledgers (
    id VARCHAR(64) PRIMARY KEY,
    party_type VARCHAR(32) NOT NULL CHECK (party_type IN ('CUSTOMER', 'SUPPLIER', 'EXPENSE', 'BANK', 'CAPITAL', 'INCOME')),
    party_id VARCHAR(64) NOT NULL,
    party_name VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(32) NOT NULL CHECK (transaction_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    reference_type VARCHAR(64) NOT NULL,
    reference_id VARCHAR(64),
    payment_mode VARCHAR(32) DEFAULT 'Cash',
    narration TEXT,
    created_by_user_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledgers_party ON ledgers(party_type, party_id, created_at DESC);

-- 9. Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(64) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(32) NOT NULL DEFAULT 'Cash',
    bank_account_id VARCHAR(64),
    shift_id VARCHAR(64),
    description TEXT,
    paid_to VARCHAR(255),
    created_by_user_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);

-- 10. Bank Accounts & Transactions
CREATE TABLE IF NOT EXISTS bank_accounts (
    id VARCHAR(64) PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_title VARCHAR(255) NOT NULL,
    branch_code VARCHAR(64),
    current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id VARCHAR(64) PRIMARY KEY,
    bank_account_id VARCHAR(64) NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT')),
    amount NUMERIC(14, 2) NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    reference_number VARCHAR(100),
    description TEXT,
    performed_by_user_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Cashier Shifts (Drawer Closing & Handover Reconciliation)
CREATE TABLE IF NOT EXISTS cashier_shifts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    device_id VARCHAR(128),
    opening_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closing_time TIMESTAMPTZ,
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(12, 2) DEFAULT 0.00,
    counted_cash NUMERIC(12, 2) DEFAULT 0.00,
    difference NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Audited')),
    shift_summary JSONB DEFAULT '{}'::jsonb,
    closing_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_user ON cashier_shifts(user_id, status);

-- 12. Supplier Returns / Debit Notes (Dr. Note)
CREATE TABLE IF NOT EXISTS supplier_returns (
    id VARCHAR(64) PRIMARY KEY,
    return_challan_number VARCHAR(64) NOT NULL UNIQUE,
    supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id),
    supplier_name VARCHAR(255) NOT NULL,
    total_return_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Completed',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    reason TEXT,
    created_by_user_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Shortage Items, Narcotics Logs, Chronic Patient Refills & Notes
CREATE TABLE IF NOT EXISTS shortage_items (
    id VARCHAR(64) PRIMARY KEY,
    medicine_name VARCHAR(255) NOT NULL,
    generic_formula VARCHAR(255),
    requested_qty NUMERIC(10, 2) NOT NULL DEFAULT 1,
    priority VARCHAR(32) NOT NULL DEFAULT 'High',
    customer_name VARCHAR(255),
    customer_phone VARCHAR(64),
    notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS narcotics_logs (
    id VARCHAR(64) PRIMARY KEY,
    medicine_id VARCHAR(64) NOT NULL REFERENCES medicines(id),
    medicine_name VARCHAR(255) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_cnic VARCHAR(64),
    doctor_name VARCHAR(255) NOT NULL,
    doctor_registration VARCHAR(64),
    quantity NUMERIC(10, 2) NOT NULL,
    prescribed_date DATE NOT NULL,
    dispensed_by_user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chronic_patient_refills (
    id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) REFERENCES loyalty_customers(id),
    patient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    condition_diagnosis VARCHAR(255),
    medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
    refill_interval_days INT NOT NULL DEFAULT 30,
    last_refill_date DATE NOT NULL,
    next_refill_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(64) DEFAULT 'General',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
