import { v4 as uuidv4 } from 'uuid';
import { Booker, BookerCommissionTransaction, Invoice, PurchaseOrder } from '../types';
import { dbBookers, dbBookerTransactions, dbInvoices } from './db';
import { emitToast } from '../contexts/ToastContext';

export const DEFAULT_BOOKER_SEEDS: Booker[] = [
  {
    id: 'booker-bilal-01',
    name: 'Bilal Khan',
    roleType: 'Booker',
    phone: '0300-1234567',
    email: 'bilal.orders@mbiinventra.com',
    cnic: '35202-1234567-1',
    address: 'Circular Road, Lahore',
    areaOrRoute: 'Main Market & Doctor Clinics',
    commissionPercentage: 3.0,
    salesTarget: 500000,
    currentBalance: 0,
    totalOrdersBooked: 0,
    totalSalesVolume: 0,
    totalCommissionEarned: 0,
    totalCommissionPaid: 0,
    status: 'Active',
    notes: 'Primary Order Booker for Wholesale Medical Stores & Hospitals',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'booker-usman-02',
    name: 'Usman Ghani',
    roleType: 'Biller',
    phone: '0321-9876543',
    email: 'usman.billing@mbiinventra.com',
    cnic: '35201-9876543-3',
    address: 'Ferozepur Road, Lahore',
    areaOrRoute: 'North Zone & Surgical Town',
    commissionPercentage: 2.0,
    salesTarget: 400000,
    currentBalance: 0,
    totalOrdersBooked: 0,
    totalSalesVolume: 0,
    totalCommissionEarned: 0,
    totalCommissionPaid: 0,
    status: 'Active',
    notes: 'Counter & Delivery Biller handling fast-track deliveries',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'booker-kashif-03',
    name: 'Kashif Ali',
    roleType: 'Booker and Biller',
    phone: '0333-5554433',
    email: 'kashif.field@mbiinventra.com',
    cnic: '35203-5554433-5',
    address: 'Shahdara Town, Lahore',
    areaOrRoute: 'East Route & Rural Clinics',
    commissionPercentage: 3.5,
    salesTarget: 600000,
    currentBalance: 0,
    totalOrdersBooked: 0,
    totalSalesVolume: 0,
    totalCommissionEarned: 0,
    totalCommissionPaid: 0,
    status: 'Active',
    notes: 'Field Sales & Instant Billing Specialist',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export class BookerService {
  /**
   * Load all bookers and ensure seed records exist on first run
   */
  static async getBookers(): Promise<Booker[]> {
    try {
      let bookers = await dbBookers.getAll();
      if (!bookers || bookers.length === 0) {
        for (const b of DEFAULT_BOOKER_SEEDS) {
          await dbBookers.save(b);
        }
        bookers = await dbBookers.getAll();
      }
      return bookers;
    } catch (err) {
      console.warn('Error fetching bookers:', err);
      return DEFAULT_BOOKER_SEEDS;
    }
  }

  /**
   * Fetch single booker with live recalculated statistics
   */
  static async getBookerDetails(bookerId: string): Promise<{
    booker: Booker | null;
    transactions: BookerCommissionTransaction[];
    recentInvoices: Invoice[];
  }> {
    const bookers = await this.getBookers();
    const booker = bookers.find(b => b.id === bookerId) || null;
    
    if (!booker) {
      return { booker: null, transactions: [], recentInvoices: [] };
    }

    const allTx = await dbBookerTransactions.getByBookerId(bookerId);
    const sortedTx = allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Also get all invoices associated with this booker
    const allInvoices = await dbInvoices.getAll();
    const bookerInvoices = allInvoices.filter(i => i.bookerId === bookerId || (i.bookerName && i.bookerName.toLowerCase() === booker.name.toLowerCase()));

    return {
      booker,
      transactions: sortedTx,
      recentInvoices: bookerInvoices
    };
  }

  /**
   * Save or Update a Booker record
   */
  static async saveBooker(data: Partial<Booker>): Promise<Booker> {
    const isNew = !data.id;
    const booker: Booker = {
      id: data.id || `booker-${uuidv4().slice(0, 8)}`,
      name: data.name?.trim() || 'Unnamed Booker',
      roleType: data.roleType || 'Booker',
      phone: data.phone?.trim() || '',
      email: data.email?.trim() || '',
      cnic: data.cnic?.trim() || '',
      address: data.address?.trim() || '',
      areaOrRoute: data.areaOrRoute?.trim() || 'General Territory',
      commissionPercentage: Number(data.commissionPercentage) || 0,
      salesTarget: Number(data.salesTarget) || 0,
      currentBalance: Number(data.currentBalance) || 0,
      totalOrdersBooked: Number(data.totalOrdersBooked) || 0,
      totalSalesVolume: Number(data.totalSalesVolume) || 0,
      totalCommissionEarned: Number(data.totalCommissionEarned) || 0,
      totalCommissionPaid: Number(data.totalCommissionPaid) || 0,
      status: data.status || 'Active',
      notes: data.notes?.trim() || '',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbBookers.save(booker);
    window.dispatchEvent(new CustomEvent('mbi-bookers-updated', { detail: { bookerId: booker.id } }));
    return booker;
  }

  /**
   * Delete a Booker
   */
  static async deleteBooker(id: string): Promise<boolean> {
    try {
      await dbBookers.delete(id);
      window.dispatchEvent(new CustomEvent('mbi-bookers-updated', { detail: { deletedId: id } }));
      return true;
    } catch (e) {
      console.error('Failed to delete booker:', e);
      return false;
    }
  }

  /**
   * Link an order / sale invoice to a booker and record in the booker ledger
   */
  static async recordSaleForBooker(
    invoice: Invoice,
    bookerIdOrName?: string,
    overrideCommissionPercent?: number
  ): Promise<BookerCommissionTransaction | null> {
    const targetBooker = bookerIdOrName || invoice.bookerId || invoice.bookerName;
    if (!targetBooker) return null;

    try {
      const bookers = await this.getBookers();
      let booker = bookers.find(b => b.id === targetBooker || b.name.toLowerCase() === targetBooker.toLowerCase().trim());

      if (!booker) {
        // Auto-create booker if not registered yet
        booker = await this.saveBooker({
          name: targetBooker,
          roleType: 'Booker',
          commissionPercentage: overrideCommissionPercent !== undefined ? overrideCommissionPercent : (invoice.bookerCommissionPercent ?? 2.5)
        });
      }

      const commissionPercent = overrideCommissionPercent !== undefined ? overrideCommissionPercent : (invoice.bookerCommissionPercent ?? booker.commissionPercentage ?? 0);
      const saleAmount = Number(invoice.grandTotal || invoice.subTotal || 0);
      const commissionAmount = Math.round((saleAmount * commissionPercent) / 100);

      // 1. Create transaction in Booker ledger
      const tx: BookerCommissionTransaction = {
        id: `btx-${uuidv4().slice(0, 8)}`,
        tenantId: invoice.tenantId,
        bookerId: booker.id,
        bookerName: booker.name,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        partyId: invoice.partyId,
        partyName: invoice.customerName || invoice.billingName || 'Walk-in Customer',
        saleAmount,
        commissionPercentage: commissionPercent,
        commissionAmount,
        type: 'EARNED_COMMISSION',
        date: invoice.date || new Date().toISOString(),
        paymentMode: invoice.paymentType === 'Cash' ? 'Cash' : 'Bank Transfer',
        status: 'Recorded',
        notes: `Commission for Sale Invoice #${invoice.invoiceNumber} (${invoice.customerName})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbBookerTransactions.save(tx);

      // 2. Update Booker aggregated progress metrics
      const updatedBooker: Booker = {
        ...booker,
        totalOrdersBooked: (booker.totalOrdersBooked || 0) + 1,
        totalSalesVolume: (booker.totalSalesVolume || 0) + saleAmount,
        totalCommissionEarned: (booker.totalCommissionEarned || 0) + commissionAmount,
        currentBalance: (booker.currentBalance || 0) + commissionAmount,
        updatedAt: new Date().toISOString()
      };

      await dbBookers.save(updatedBooker);
      window.dispatchEvent(new CustomEvent('mbi-bookers-updated', { detail: { bookerId: booker.id, transactionId: tx.id } }));
      return tx;
    } catch (err) {
      console.error('Failed to record sale for booker:', err);
      return null;
    }
  }

  /**
   * Record a commission payout / payment out to a Booker
   */
  static async recordPayout(
    bookerId: string,
    amount: number,
    paymentMode: 'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque' = 'Cash',
    referenceNo?: string,
    notes?: string
  ): Promise<BookerCommissionTransaction | null> {
    if (amount <= 0) return null;

    try {
      const bookers = await this.getBookers();
      const booker = bookers.find(b => b.id === bookerId);
      if (!booker) return null;

      const tx: BookerCommissionTransaction = {
        id: `btx-${uuidv4().slice(0, 8)}`,
        bookerId: booker.id,
        bookerName: booker.name,
        saleAmount: 0,
        commissionPercentage: 0,
        commissionAmount: amount,
        type: 'PAYOUT',
        date: new Date().toISOString(),
        paymentMode,
        referenceNo,
        status: 'Paid',
        notes: notes || `Commission Payout of Rs. ${amount.toLocaleString()} paid via ${paymentMode}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbBookerTransactions.save(tx);

      // Update Booker balance
      const updatedBooker: Booker = {
        ...booker,
        totalCommissionPaid: (booker.totalCommissionPaid || 0) + amount,
        currentBalance: Math.max(0, (booker.currentBalance || 0) - amount),
        updatedAt: new Date().toISOString()
      };

      await dbBookers.save(updatedBooker);
      window.dispatchEvent(new CustomEvent('mbi-bookers-updated', { detail: { bookerId: booker.id, payoutId: tx.id } }));
      return tx;
    } catch (err) {
      console.error('Failed to record payout for booker:', err);
      return null;
    }
  }
}

export const bookerService = BookerService;
export default BookerService;
