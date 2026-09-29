import * as XLSX from 'xlsx';
import { Party, Medicine, Supplier } from '../types';

// ==================== PARTIES TEMPLATE & EXPORT/IMPORT ====================

export interface ParsedPartyRow {
  name: string;
  partyType: 'Customer' | 'Supplier';
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  openingBalance: number;
  creditLimit: number;
  taxNumber: string;
  paymentTerms: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Downloads a pre-formatted Excel template for importing Parties
 */
export const downloadPartyTemplateExcel = () => {
  const sampleData = [
    {
      'Party Name *': 'Saleem Pharmacy Kot Momin',
      'Party Type (Customer/Supplier)': 'Customer',
      'Contact Person': 'Muhammad Saleem',
      'Phone Number *': '03216549608',
      'Email': 'saleem.pharma@gmail.com',
      'Address': 'Main Bazar Kot Momin, Sargodha',
      'Opening Balance (PKR)': 109040,
      'Credit Limit (PKR)': 200000,
      'GST / NTN': '4012398-7',
      'Payment Terms': 'Net 15',
    },
    {
      'Party Name *': 'Imran President Surgicals',
      'Party Type (Customer/Supplier)': 'Supplier',
      'Contact Person': 'Imran Ashraf',
      'Phone Number *': '03001234567',
      'Email': 'imran@presidentsurgicals.pk',
      'Address': 'Katchery Road, Sargodha',
      'Opening Balance (PKR)': 20800,
      'Credit Limit (PKR)': 500000,
      'GST / NTN': '3918231-1',
      'Payment Terms': 'Net 30',
    },
    {
      'Party Name *': 'Pakistan Pharma Kot Momin',
      'Party Type (Customer/Supplier)': 'Customer',
      'Contact Person': 'Dr. Tariq Mahmood',
      'Phone Number *': '03009876543',
      'Email': 'pakistanpharma@yahoo.com',
      'Address': 'Hospital Road, Kot Momin',
      'Opening Balance (PKR)': 18430,
      'Credit Limit (PKR)': 100000,
      'GST / NTN': '',
      'Payment Terms': 'Due on Receipt',
    },
    {
      'Party Name *': 'GSK & Abbott Pharma Distributors',
      'Party Type (Customer/Supplier)': 'Supplier',
      'Contact Person': 'Shahid Mehmood',
      'Phone Number *': '03335544332',
      'Email': 'sales@gskdistributors.pk',
      'Address': 'Medicine Market, Faisalabad',
      'Opening Balance (PKR)': 14500,
      'Credit Limit (PKR)': 1000000,
      'GST / NTN': '1098234-9',
      'Payment Terms': 'Net 30',
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 32 }, // Party Name
    { wch: 28 }, // Party Type
    { wch: 22 }, // Contact Person
    { wch: 18 }, // Phone Number
    { wch: 26 }, // Email
    { wch: 32 }, // Address
    { wch: 22 }, // Opening Balance
    { wch: 18 }, // Credit Limit
    { wch: 16 }, // GST / NTN
    { wch: 16 }, // Payment Terms
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Parties_Template');

  XLSX.writeFile(wb, 'MBI_Inventra_Parties_Template.xlsx');
};

/**
 * Exports current parties list to Excel file
 */
export const exportPartiesToExcel = (parties: (Party | Supplier)[]) => {
  const exportData = parties.map(p => ({
    'Party Name': p.name || '',
    'Party Type': p.partyType || (p.paymentTerms ? 'Supplier' : 'Customer'),
    'Contact Person': p.contactPerson || '',
    'Phone Number': p.phone || '',
    'Email': p.email || '',
    'Address': p.address || '',
    'Balance (PKR)': p.balance ?? p.openingBalance ?? 0,
    'Credit Limit (PKR)': p.creditLimit || 0,
    'GST / NTN': p.taxNumber || '',
    'Payment Terms': p.paymentTerms || '',
    'Created At': p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 30 }, { wch: 16 }, { wch: 20 }, { wch: 18 }, 
    { wch: 26 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, 
    { wch: 16 }, { wch: 16 }, { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Parties');

  const fileName = `MBI_Inventra_Parties_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Parses uploaded Excel / CSV file containing parties
 */
export const parsePartiesExcel = async (file: File): Promise<ParsedPartyRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to raw JSON rows
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        const parsed: ParsedPartyRow[] = rawRows.map((row) => {
          const errors: string[] = [];

          // Find keys flexibly
          const name = String(
            row['Party Name *'] || row['Party Name'] || row['name'] || row['Name'] || row['Party'] || ''
          ).trim();

          const rawType = String(
            row['Party Type (Customer/Supplier)'] || row['Party Type'] || row['type'] || row['Type'] || ''
          ).trim().toLowerCase();

          const partyType: 'Customer' | 'Supplier' = 
            rawType.includes('sup') ? 'Supplier' : 'Customer';

          const contactPerson = String(
            row['Contact Person'] || row['contactPerson'] || row['Contact'] || ''
          ).trim();

          const phone = String(
            row['Phone Number *'] || row['Phone Number'] || row['phone'] || row['Phone'] || row['Mobile'] || ''
          ).trim();

          const email = String(
            row['Email'] || row['email'] || row['Email Address'] || ''
          ).trim();

          const address = String(
            row['Address'] || row['address'] || row['City'] || ''
          ).trim();

          const openingBalance = Number(
            row['Opening Balance (PKR)'] || row['Opening Balance'] || row['balance'] || row['Balance'] || 0
          ) || 0;

          const creditLimit = Number(
            row['Credit Limit (PKR)'] || row['Credit Limit'] || row['creditLimit'] || 0
          ) || 0;

          const taxNumber = String(
            row['GST / NTN'] || row['GST'] || row['NTN'] || row['taxNumber'] || ''
          ).trim();

          const paymentTerms = String(
            row['Payment Terms'] || row['paymentTerms'] || row['Terms'] || 'Due on Receipt'
          ).trim();

          if (!name) {
            errors.push('Party Name is required');
          }

          return {
            name,
            partyType,
            contactPerson,
            phone,
            email,
            address,
            openingBalance,
            creditLimit,
            taxNumber,
            paymentTerms,
            isValid: errors.length === 0,
            errors
          };
        });

        resolve(parsed.filter(r => r.name || r.phone));
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

// ==================== GOOGLE & PHONE CONTACTS PARSER ====================

export interface ContactItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  source: 'Phone' | 'Google Contacts' | 'vCard';
  selected?: boolean;
}

/**
 * Parses Google Contacts CSV or vCard (.vcf)
 */
export const parseContactsFile = async (file: File): Promise<ContactItem[]> => {
  const isVCard = file.name.endsWith('.vcf') || file.name.endsWith('.vcard');

  if (isVCard) {
    const text = await file.text();
    return parseVCard(text);
  }

  // Parse CSV (e.g. Google Contacts export)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

        const contacts: ContactItem[] = [];

        rows.forEach((row, idx) => {
          const name = String(
            row['Name'] || row['Given Name'] || row['Full Name'] || row['First Name'] || 
            (row['Given Name'] ? `${row['Given Name']} ${row['Family Name'] || ''}` : '') || ''
          ).trim();

          const phone = String(
            row['Phone 1 - Value'] || row['Phone'] || row['Mobile'] || row['Phone Number'] || row['Mobile Phone'] || ''
          ).trim();

          const email = String(
            row['E-mail 1 - Value'] || row['Email'] || row['E-mail Address'] || ''
          ).trim();

          const address = String(
            row['Address 1 - Formatted'] || row['Address'] || row['Home Address'] || ''
          ).trim();

          if (name || phone) {
            contacts.push({
              id: `contact-${idx}-${Date.now()}`,
              name: name || phone || `Contact ${idx + 1}`,
              phone: phone || '',
              email: email || '',
              address: address || '',
              source: 'Google Contacts',
              selected: true
            });
          }
        });

        resolve(contacts);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

function parseVCard(vcardText: string): ContactItem[] {
  const cards = vcardText.split(/BEGIN:VCARD/i).filter(c => c.trim().length > 0);
  const contacts: ContactItem[] = [];

  cards.forEach((card, idx) => {
    const fnMatch = card.match(/FN:(.+)/i);
    const nMatch = card.match(/N:(.+)/i);
    const telMatch = card.match(/TEL.*:(.+)/i);
    const emailMatch = card.match(/EMAIL.*:(.+)/i);
    const adrMatch = card.match(/ADR.*:(.+)/i);

    const name = fnMatch ? fnMatch[1].trim() : (nMatch ? nMatch[1].replace(/;/g, ' ').trim() : '');
    const phone = telMatch ? telMatch[1].trim().replace(/[^\d+]/g, '') : '';
    const email = emailMatch ? emailMatch[1].trim() : '';
    const address = adrMatch ? adrMatch[1].replace(/;/g, ' ').trim() : '';

    if (name || phone) {
      contacts.push({
        id: `vcf-${idx}-${Date.now()}`,
        name: name || phone || `Contact ${idx + 1}`,
        phone: phone || '',
        email: email || '',
        address: address || '',
        source: 'vCard',
        selected: true
      });
    }
  });

  return contacts;
}

// ==================== PRODUCTS / INVENTORY TEMPLATE & EXPORT/IMPORT ====================

export interface ParsedProductRow {
  name: string;
  genericFormula?: string;
  category?: string;
  unit?: string;
  barcode: string;
  batchNumber: string;
  manufacturer: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  lowStockThreshold: number;
  gstPercentage: number;
  isValid: boolean;
  errors: string[];
}

/**
 * Downloads a pre-formatted Excel template for importing Medicines / Products
 */
export const downloadProductTemplateExcel = () => {
  const sampleData = [
    {
      'Medicine Name *': 'Panadol 500mg Tab (Box of 200)',
      'Generic Formula': 'Paracetamol',
      'Company *': 'GlaxoSmithKline (GSK)',
      'Barcode': '8964000120011',
      'Batch Number *': 'PAN-882',
      'Purchase Price (PKR) *': 380,
      'MRP (PKR) *': 480,
      'Current Stock *': 250,
      'Pack Size / Unit': 'Box',
      'Selling Price (PKR)': 420,
      'Expiry Date (YYYY-MM-DD) *': '2027-12-31',
      'Min Stock Alert Level': 40,
      'Category': 'Analgesics & Pain Relief',
      'GST %': 0
    },
    {
      'Medicine Name *': 'Augmentin 625mg Tab (Pack of 14)',
      'Generic Formula': 'Amoxicillin + Clavulanic Acid',
      'Company *': 'GlaxoSmithKline (GSK)',
      'Barcode': '8964000120028',
      'Batch Number *': 'AUG-904',
      'Purchase Price (PKR) *': 280,
      'MRP (PKR) *': 350,
      'Current Stock *': 120,
      'Pack Size / Unit': 'Pack',
      'Selling Price (PKR)': 310,
      'Expiry Date (YYYY-MM-DD) *': '2027-08-15',
      'Min Stock Alert Level': 25,
      'Category': 'Antibiotics',
      'GST %': 0
    },
    {
      'Medicine Name *': 'Risek 20mg Cap (Pack of 14)',
      'Generic Formula': 'Omeprazole',
      'Company *': 'Getz Pharma',
      'Barcode': '8964000120035',
      'Batch Number *': 'RSK-201',
      'Purchase Price (PKR) *': 260,
      'MRP (PKR) *': 320,
      'Current Stock *': 95,
      'Pack Size / Unit': 'Pack',
      'Selling Price (PKR)': 295,
      'Expiry Date (YYYY-MM-DD) *': '2027-11-30',
      'Min Stock Alert Level': 20,
      'Category': 'Gastroenterology',
      'GST %': 0
    },
    {
      'Medicine Name *': 'Disprin 300mg Tab (Box of 100)',
      'Generic Formula': 'Aspirin',
      'Company *': 'Reckitt Benckiser',
      'Barcode': '8964000120042',
      'Batch Number *': 'DSP-441',
      'Purchase Price (PKR) *': 180,
      'MRP (PKR) *': 240,
      'Current Stock *': 150,
      'Pack Size / Unit': 'Box',
      'Selling Price (PKR)': 210,
      'Expiry Date (YYYY-MM-DD) *': '2028-02-28',
      'Min Stock Alert Level': 30,
      'Category': 'Cardio & Pain',
      'GST %': 0
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [
    { wch: 38 }, // Medicine Name
    { wch: 28 }, // Generic Formula
    { wch: 26 }, // Company
    { wch: 18 }, // Barcode
    { wch: 18 }, // Batch Number
    { wch: 22 }, // Purchase Price
    { wch: 16 }, // MRP
    { wch: 16 }, // Current Stock
    { wch: 18 }, // Pack Size
    { wch: 20 }, // Selling Price
    { wch: 24 }, // Expiry Date
    { wch: 22 }, // Min Stock Alert
    { wch: 26 }, // Category
    { wch: 12 }  // GST %
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Medicine_Import_Template');

  XLSX.writeFile(wb, 'MBI_Sample_Medicine_Import_Template.xlsx');
};

/**
 * Exports products inventory to Excel file
 */
export const exportProductsToExcel = (medicines: Medicine[]) => {
  const exportData = medicines.map(m => ({
    'Medicine / Item Name': m.name,
    'Generic Formula': m.genericFormula || m.genericName || '',
    'Company / Manufacturer': m.manufacturer || m.brandName || '',
    'Category': m.category || 'General',
    'Barcode': m.barcode || '',
    'Batch Number': m.batchNumber || 'B-01',
    'Expiry Date': m.expiryDate ? m.expiryDate.slice(0, 10) : '',
    'Current Stock': m.quantity,
    'Pack Size / Unit': m.unit || 'PCS',
    'Trade / Purchase Price (PKR)': m.purchasePrice,
    'MRP (PKR)': m.mrp || m.sellingPrice || 0,
    'Selling Price (PKR)': m.sellingPrice,
    'Total Stock Valuation (PKR)': (m.quantity || 0) * (m.purchasePrice || 0),
    'Min Stock Reorder Level': m.lowStockThreshold || 20,
    'GST %': m.gstPercentage || 0,
    'Rack Location': m.rackLocation || 'A-1',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 36 }, { wch: 28 }, { wch: 26 }, { wch: 20 },
    { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, 
    { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 20 }, 
    { wch: 24 }, { wch: 22 }, { wch: 12 }, { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock_Report');

  const fileName = `MBI_Medicines_Stock_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Parses uploaded Excel / CSV file containing medicines/products
 */
export const parseProductsExcel = async (file: File): Promise<ParsedProductRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        const parsed: ParsedProductRow[] = rawRows.map((row) => {
          const errors: string[] = [];

          const name = String(
            row['Medicine Name *'] || row['Medicine Name'] || row['Item / Medicine Name *'] || row['Item Name'] || row['name'] || row['Name'] || row['Product Name'] || ''
          ).trim();

          const genericFormula = String(
            row['Generic Formula'] || row['Generic Name'] || row['genericFormula'] || row['genericName'] || row['Salt'] || row['Formula'] || ''
          ).trim();

          const barcode = String(
            row['Barcode'] || row['barcode'] || row['Code'] || row['Barcode / SKU'] || ''
          ).trim();

          const batchNumber = String(
            row['Batch Number *'] || row['Batch Number'] || row['batchNumber'] || row['Batch'] || 'B-01'
          ).trim();

          const manufacturer = String(
            row['Company *'] || row['Company'] || row['Manufacturer *'] || row['Manufacturer'] || row['manufacturer'] || row['Brand'] || 'General Pharma'
          ).trim();

          let expiryDate = String(
            row['Expiry Date (YYYY-MM-DD) *'] || row['Expiry Date'] || row['expiryDate'] || row['Expiry'] || ''
          ).trim();

          if (!expiryDate) {
            // default 1 year from now
            expiryDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10);
          }

          const quantity = Number(
            row['Current Stock *'] || row['Current Stock'] || row['Quantity in Stock *'] || row['Quantity'] || row['quantity'] || row['Stock'] || 0
          ) || 0;

          const purchasePrice = Number(
            row['Purchase Price (PKR) *'] || row['Purchase Price'] || row['purchasePrice'] || row['Trade / Purchase Price (PKR)'] || row['Trade Price'] || row['Cost Price'] || 0
          ) || 0;

          const mrp = Number(
            row['MRP (PKR) *'] || row['MRP'] || row['mrp'] || 0
          ) || purchasePrice;

          const sellingPrice = Number(
            row['Selling Price (PKR)'] || row['Selling Price (PKR) *'] || row['Selling Price'] || row['sellingPrice'] || mrp || 0
          ) || mrp;

          const lowStockThreshold = Number(
            row['Min Stock Alert Level'] || row['Low Stock Alert Level'] || row['Low Stock Alert'] || row['lowStockThreshold'] || 20
          ) || 20;

          const gstPercentage = Number(
            row['GST %'] || row['GST'] || row['gstPercentage'] || 0
          ) || 0;

          const unit = String(
            row['Pack Size / Unit'] || row['Pack Size'] || row['Unit'] || row['unit'] || 'PCS'
          ).trim();

          const category = String(
            row['Category'] || row['category'] || 'General'
          ).trim();

          if (!name) {
            errors.push('Product / Medicine Name is required');
          }

          return {
            name,
            genericFormula,
            category,
            unit,
            barcode,
            batchNumber,
            manufacturer,
            expiryDate,
            quantity,
            purchasePrice,
            mrp,
            sellingPrice,
            lowStockThreshold,
            gstPercentage,
            isValid: errors.length === 0,
            errors
          };
        });

        resolve(parsed.filter(r => r.name));
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Universal Parser for Excel (.xlsx, .xls) and CSV files
 */
export const parseExcelOrCsv = (file: File): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Universal JSON to Excel Exporter
 */
export const exportToExcel = (data: Record<string, any>[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

