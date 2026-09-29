import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getMariaDbPool, isMariaDbAvailable, syncRecordToMariaDb } from '../db/mariaClient';
import { broadcastTenantEvent } from '../routes/syncRoutes';

export async function getPurchases(req: Request, res: Response) {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers['x-tenant-id'] as string) || 'default';
    const isOnline = await isMariaDbAvailable();

    if (!isOnline) {
      return res.json({
        success: true,
        source: 'cache',
        data: [],
        message: 'Database in local offline sync mode'
      });
    }

    const pool = getMariaDbPool();
    const [rows] = await pool.execute(
      `SELECT * FROM mbi_purchases WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100`,
      [tenantId]
    );

    res.json({
      success: true,
      data: rows,
      count: Array.isArray(rows) ? rows.length : 0
    });
  } catch (error: any) {
    console.error('[PURCHASE_GET_ERROR]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch purchases' });
  }
}

export async function getPurchaseById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const isOnline = await isMariaDbAvailable();

    if (!isOnline) {
      return res.status(404).json({ success: false, message: 'Database offline' });
    }

    const pool = getMariaDbPool();
    const [purchases]: any = await pool.execute(`SELECT * FROM mbi_purchases WHERE id = ? LIMIT 1`, [id]);
    
    if (!purchases || purchases.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase bill not found' });
    }

    const purchase = purchases[0];
    const [batches]: any = await pool.execute(
      `SELECT * FROM mbi_inventory_batches WHERE purchase_bill_id = ? OR id LIKE ?`,
      [id, `%${id}%`]
    );

    res.json({
      success: true,
      data: {
        ...purchase,
        batches: batches || []
      }
    });
  } catch (error: any) {
    console.error('[PURCHASE_GET_SINGLE_ERROR]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch purchase details' });
  }
}

export async function createPurchaseOrder(req: Request, res: Response) {
  try {
    const purchaseData = req.body;
    const tenantId = (req.query.tenantId as string) || req.body.tenantId || (req.headers['x-tenant-id'] as string) || 'default';
    const purchaseId = purchaseData.id || uuidv4();
    const supplierId = purchaseData.supplierId || purchaseData.partyId || 'sup_general';
    const supplierName = purchaseData.supplierName || purchaseData.partyName || 'Direct Vendor';
    const totalAmount = Number(purchaseData.totalAmount || purchaseData.grandTotal || 0);
    const paidAmount = Number(purchaseData.paidAmount || 0);
    const balanceDue = Number(purchaseData.balanceDue !== undefined ? purchaseData.balanceDue : (totalAmount - paidAmount));
    const billNumber = purchaseData.billNumber || purchaseData.supplierBillNumber || purchaseData.poNumber || `PUR-${Date.now().toString().slice(-6)}`;
    const billDate = purchaseData.billDate || purchaseData.date || new Date().toISOString().slice(0, 10);
    const paymentMode = purchaseData.paymentMode || (purchaseData.isCredit ? 'Credit' : 'Cash');
    const items = Array.isArray(purchaseData.items) ? purchaseData.items : [];
    const userId = purchaseData.userId || req.body.userId || 'admin';
    const userName = purchaseData.cashierName || purchaseData.userName || 'Admin / Operator';

    const isOnline = await isMariaDbAvailable();

    if (isOnline) {
      const pool = getMariaDbPool();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // 1. Insert or update mbi_purchases
        const purchaseSql = `
          INSERT INTO mbi_purchases
          (id, tenant_id, purchase_number, supplier_id, supplier_name, bill_date, total_amount, paid_amount, balance_due, payment_mode)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          supplier_name = VALUES(supplier_name),
          total_amount = VALUES(total_amount),
          paid_amount = VALUES(paid_amount),
          balance_due = VALUES(balance_due),
          payment_mode = VALUES(payment_mode),
          updated_at = CURRENT_TIMESTAMP
        `;
        await connection.execute(purchaseSql, [
          purchaseId,
          tenantId,
          billNumber,
          supplierId,
          supplierName,
          billDate.slice(0, 10),
          totalAmount,
          paidAmount,
          balanceDue,
          paymentMode
        ]);

        // 2. Process each item (Auto-Upsert Medicine + Batch + Stock Increase)
        for (const item of items) {
          if (!item.name || !item.name.trim()) continue;

          const qty = Number(item.quantity || item.qty || 0);
          const freeQty = Number(item.freeQuantity || item.free_qty || 0);
          const totalInwardQty = qty + freeQty;
          const purchaseCost = Number(item.purchasePrice || item.pricePerUnit || item.purchase_price || item.unitPrice || 0);
          const mrp = Number(item.mrp || item.sellingPrice || (purchaseCost * 1.25));
          const batchNo = (item.batchNumber || item.batch_no || `BATCH-${Date.now().toString().slice(-4)}`).trim();
          const expDate = item.expiryDate ? item.expiryDate.slice(0, 10) : (item.exp_date ? item.exp_date.slice(0, 10) : '2028-12-31');
          const unit = item.unit || 'Box';
          const barcode = item.barcode || '';
          const hsnCode = item.hsnCode || item.hsn_sac || '';
          const genericSalt = item.genericSalt || item.generic_salt || '';

          // A. Find or create medicine
          const [medRows]: any = await connection.execute(
            'SELECT id, name FROM mbi_medicines WHERE tenant_id = ? AND (name = ? OR (barcode = ? AND barcode != "")) LIMIT 1',
            [tenantId, item.name.trim(), barcode]
          );

          let medicineId: string;
          if (medRows && medRows.length > 0) {
            medicineId = medRows[0].id;
            await connection.execute(
              `UPDATE mbi_medicines SET 
                generic_salt = COALESCE(?, generic_salt),
                dosage_form = ?,
                hsn_code = COALESCE(?, hsn_code),
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND tenant_id = ?`,
              [genericSalt || null, unit, hsnCode || null, medicineId, tenantId]
            ).catch(() => {
              // fallback if some columns not present
              return connection.execute(
                `UPDATE mbi_medicines SET dosage_form = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?`,
                [unit, medicineId, tenantId]
              );
            });
          } else {
            medicineId = item.medicineId || uuidv4();
            await connection.execute(
              `INSERT INTO mbi_medicines 
                (id, tenant_id, name, generic_salt, company, category, dosage_form, barcode, min_stock_level, pack_size)
              VALUES (?, ?, ?, ?, ?, 'General Medicine', ?, ?, 5, 1)
              ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
              [
                medicineId,
                tenantId,
                item.name.trim(),
                genericSalt || null,
                supplierName || 'General',
                unit,
                barcode || null
              ]
            );
          }

          // B. Upsert Batch into mbi_inventory_batches (FEFO Ready + Increment Stock)
          const batchId = item.batchId || `batch_${medicineId}_${batchNo.replace(/[^a-zA-Z0-9]/g, '_')}`;
          await connection.execute(
            `INSERT INTO mbi_inventory_batches (
              id, tenant_id, medicine_id, batch_number, expiry_date, 
              purchase_rate, mrp_selling_price, current_stock_quantity, 
              supplier_id, godown_location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Main Store')
            ON DUPLICATE KEY UPDATE 
              current_stock_quantity = current_stock_quantity + VALUES(current_stock_quantity),
              purchase_rate = VALUES(purchase_rate),
              mrp_selling_price = VALUES(mrp_selling_price),
              expiry_date = VALUES(expiry_date),
              updated_at = CURRENT_TIMESTAMP`,
            [
              batchId,
              tenantId,
              medicineId,
              batchNo,
              expDate,
              purchaseCost,
              mrp,
              totalInwardQty,
              supplierId
            ]
          );
        }

        // 3. Update Supplier Khata & Record in mbi_party_transactions
        if (supplierId && supplierId !== 'sup_general') {
          // Update Supplier Current Balance in mbi_parties
          await connection.execute(
            `UPDATE mbi_parties SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?`,
            [balanceDue, supplierId, tenantId]
          );

          // Credit transaction (Bill Total)
          const transId = uuidv4();
          await connection.execute(
            `INSERT INTO mbi_party_transactions
            (id, tenant_id, party_id, transaction_type, amount, balance_after, reference_id, description, date)
            VALUES (?, ?, ?, 'CREDIT', ?, (SELECT current_balance FROM mbi_parties WHERE id = ? LIMIT 1), ?, ?, CURRENT_TIMESTAMP)`,
            [
              transId,
              tenantId,
              supplierId,
              totalAmount,
              supplierId,
              billNumber,
              `Inward Purchase Bill #${billNumber} (${items.length} items)`
            ]
          );

          // Debit transaction (Paid amount on spot)
          if (paidAmount > 0) {
            const payTransId = uuidv4();
            await connection.execute(
              `INSERT INTO mbi_party_transactions
              (id, tenant_id, party_id, transaction_type, amount, balance_after, reference_id, description, date)
              VALUES (?, ?, ?, 'DEBIT', ?, (SELECT current_balance FROM mbi_parties WHERE id = ? LIMIT 1), ?, ?, CURRENT_TIMESTAMP)`,
              [
                payTransId,
                tenantId,
                supplierId,
                paidAmount,
                supplierId,
                billNumber,
                `Cash Payment on Purchase #${billNumber}`
              ]
            );
          }
        }

        // 4. Create Immutable Audit Log
        await connection.execute(
          `INSERT INTO mbi_audit_logs (id, tenant_id, user_id, user_name, action, category, details, created_at)
          VALUES (?, ?, ?, ?, 'CREATED_PURCHASE_BILL', 'PURCHASES', ?, CURRENT_TIMESTAMP)`,
          [
            uuidv4(),
            tenantId,
            userId,
            userName,
            `Created Purchase Bill #${billNumber} Total: Rs. ${totalAmount} (${items.length} items)`
          ]
        );

        await connection.commit();
        connection.release();

        // 5. Broadcast real-time SSE event to all connected tenant terminals
        broadcastTenantEvent(tenantId, {
          type: 'PURCHASE_CREATED',
          entity: 'purchases',
          payload: { id: purchaseId, billNumber, totalAmount, supplierName, itemsCount: items.length }
        });

      } catch (dbErr) {
        await connection.rollback();
        connection.release();
        throw dbErr;
      }
    } else {
      // Fallback offline sync cache
      await syncRecordToMariaDb('purchaseOrders', {
        ...purchaseData,
        id: purchaseId,
        tenantId,
        orderNumber: billNumber,
        grandTotal: totalAmount,
        paidAmount,
        balanceDue
      });
    }

    res.status(201).json({
      success: true,
      message: `Purchase Inward Bill #${billNumber} processed and stock updated successfully.`,
      purchaseId,
      billNumber,
      totalAmount,
      balanceDue
    });

  } catch (error: any) {
    console.error('[PURCHASE_INWARD_ERROR]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process inward purchase'
    });
  }
}
