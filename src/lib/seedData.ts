import { v4 as uuidv4 } from 'uuid';
import { 
  dbMedicines, dbSuppliers, dbInvoices, dbPurchaseOrders, 
  dbPartyPayments, dbExpenses, dbBankAccounts, dbBankTransactions, dbCheques, dbLoanAccounts,
  dbAppUsers, dbUserActivities, dbOnlineOrders, dbOnlinePromotions, dbStoreSettings,
  factoryResetAllStores
} from './db';
import { 
  Medicine, Supplier, Party, Invoice, PurchaseOrder, 
  PartyPayment, Expense, BankAccount, BankTransaction, ChequeRecord, LoanAccount,
  AppUserRecord, UserActivityLog, OnlineOrder
} from '../types';
import { DEFAULT_STORE_SETTINGS, DEFAULT_PROMOTIONS } from './storeManager';

// Clean Zero Initial State (0 Dummy Medicines, 0 Dummy Suppliers, 0 Dummy Customers)
export const DUMMY_MEDICINES: Medicine[] = [];
export const DUMMY_SUPPLIERS: Supplier[] = [];
export const DUMMY_CUSTOMERS: Party[] = [];

export const forceSeedDemoProducts = async () => {
  return 0;
};

export const generateSeedData = async () => {
  // Clean Zero state enforced for all sales, analytics, items and metrics
  return;
};

export const clearAllDemoData = async () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mbi_db_cleaned_v1', 'true');
      localStorage.setItem('mbi_zero_reset_v2', 'true');
    }
    await factoryResetAllStores();
  } catch (err) {
    console.error('Error clearing all demo data:', err);
  }
};
