import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Building2, 
  Plus,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { dbSuppliers } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';

export type PartyType = 'customer' | 'supplier';

interface AddPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyType: PartyType; // 'customer' for Udhar Ledgers | 'supplier' for Payables
  onPartyAdded?: (newParty: any) => void;
}

export const AddPartyModal: React.FC<AddPartyModalProps> = ({
  isOpen,
  onClose,
  partyType,
  onPartyAdded
}) => {
  const [activeTab, setActiveTab] = useState<'tax' | 'credit' | 'additional'>('tax');
  const [enableShipping, setEnableShipping] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    group: partyType === 'customer' ? 'Retail Customer' : 'Distributor / Vendor',
    // Tax & Address
    taxId: '', // NTN or CNIC
    email: '',
    billingAddress: '',
    shippingAddress: '',
    // Credit & Balance
    openingBalance: 0,
    balanceType: partyType === 'customer' ? 'to_receive' : 'to_pay', // to_receive (Dr) or to_pay (Cr)
    balanceDate: new Date().toISOString().split('T')[0],
    creditLimit: 0,
    creditDays: 30,
    // Additional Fields
    drugLicenseNo: '',
    bankDetails: '',
    notes: ''
  });

  if (!isOpen) return null;

  const isCustomer = partyType === 'customer';
  const modalTitle = isCustomer ? 'Add Customer Khata' : 'Add Supplier / Vendor Khata';

  const handleSubmit = async (saveAndNew: boolean = false) => {
    if (!formData.name.trim()) {
      toast.error('Party Name is required');
      return;
    }

    setLoading(true);
    try {
      const rawBal = Number(formData.openingBalance) || 0;
      const computedBalance = formData.balanceType === 'to_receive' ? Math.abs(rawBal) : -Math.abs(rawBal);

      const partyPayload = {
        id: uuidv4(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        mobile: formData.phone.trim(),
        group: formData.group,
        partyType: isCustomer ? 'Customer' : 'Supplier',
        type: partyType,
        taxId: formData.taxId,
        gstin: formData.taxId,
        email: formData.email,
        address: formData.billingAddress,
        billingAddress: formData.billingAddress,
        shippingAddress: enableShipping ? formData.shippingAddress : formData.billingAddress,
        openingBalance: computedBalance,
        balance: computedBalance,
        balanceType: formData.balanceType,
        balanceDate: formData.balanceDate,
        creditLimit: formData.creditLimit,
        creditDays: formData.creditDays,
        drugLicenseNo: formData.drugLicenseNo,
        drugLicense: formData.drugLicenseNo,
        bankDetails: formData.bankDetails,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Save to local IndexedDB
      try {
        await dbSuppliers.save(partyPayload as any);
      } catch (localDbErr) {
        console.warn('Local indexedDB save note:', localDbErr);
      }

      // 2. Call backend API route if available
      try {
        const response = await fetch('/api/khata/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partyPayload)
        });
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            Object.assign(partyPayload, result.data);
          }
        }
      } catch {
        // Continue with local saved data
      }

      toast.success(`${formData.name} added successfully!`);
      if (onPartyAdded) onPartyAdded(partyPayload);
      
      if (saveAndNew) {
        setFormData({
          name: '',
          phone: '',
          group: isCustomer ? 'Retail Customer' : 'Distributor / Vendor',
          taxId: '',
          email: '',
          billingAddress: '',
          shippingAddress: '',
          openingBalance: 0,
          balanceType: isCustomer ? 'to_receive' : 'to_pay',
          balanceDate: new Date().toISOString().split('T')[0],
          creditLimit: 0,
          creditDays: 30,
          drugLicenseNo: '',
          bankDetails: '',
          notes: ''
        });
        setEnableShipping(false);
        setActiveTab('tax');
      } else {
        onClose();
      }
    } catch (err: any) {
      toast.error('Failed to save party: ' + (err?.message || 'Database error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isCustomer ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{modalTitle}</h2>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <button 
              type="button"
              className="p-1.5 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Form */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Row: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Party Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isCustomer ? "Patient / Customer Name" : "Distributor / Supplier Name"}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number (WhatsApp)
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0300-1234567"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Party Group / Category
              </label>
              <select
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs cursor-pointer"
              >
                {isCustomer ? (
                  <>
                    <option value="Retail Customer">Retail Regular Patient</option>
                    <option value="Wholesale">Wholesale Pharmacy</option>
                    <option value="Doctor / Clinic">Doctor / Clinic Account</option>
                    <option value="Staff / Internal">Staff Member Account</option>
                  </>
                ) : (
                  <>
                    <option value="Distributor / Vendor">Official Distributor</option>
                    <option value="Manufacturer">Pharma Manufacturer</option>
                    <option value="Local Wholesale Vendor">Local Wholesale Agency</option>
                    <option value="General Supplier">General Goods Supplier</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-8 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('tax')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'tax'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tax & Address
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('credit')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'credit'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Credit & Balance</span>
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                New
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('additional')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'additional'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Additional Fields
            </button>
          </div>

          {/* Tab 1: Tax & Address */}
          {activeTab === 'tax' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    CNIC / NTN / TIN
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    placeholder="35202-xxxxxxx-x / NTN-7654321"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="party@example.com"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Billing / Pharmacy Address
                  </label>
                  <textarea
                    rows={3}
                    value={formData.billingAddress}
                    onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                    placeholder="Enter complete shop or home address..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  {!enableShipping ? (
                    <button
                      type="button"
                      onClick={() => setEnableShipping(true)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Enable Shipping / Delivery Address</span>
                    </button>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Shipping / Delivery Address
                      </label>
                      <textarea
                        rows={2}
                        value={formData.shippingAddress}
                        onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                        placeholder="Enter delivery warehouse or shipping location..."
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Credit & Balance */}
          {activeTab === 'credit' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-150">
              <div className="space-y-4 p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Opening Balance Setup
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Opening Balance (Rs.)
                  </label>
                  <input
                    type="number"
                    value={formData.openingBalance || ''}
                    onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, balanceType: 'to_receive' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.balanceType === 'to_receive'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    To Receive (Dr)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, balanceType: 'to_pay' })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.balanceType === 'to_pay'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    To Pay (Cr)
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    As of Date
                  </label>
                  <input
                    type="date"
                    value={formData.balanceDate}
                    onChange={(e) => setFormData({ ...formData, balanceDate: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Khata Credit Controls
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Credit Limit Warning (Rs.)
                  </label>
                  <input
                    type="number"
                    value={formData.creditLimit || ''}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 50000 (0 for no limit)"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Alerts cashier when pending balance exceeds this amount.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Payment Terms / Due Days
                  </label>
                  <input
                    type="number"
                    value={formData.creditDays}
                    onChange={(e) => setFormData({ ...formData, creditDays: parseInt(e.target.value) || 0 })}
                    placeholder="30"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Additional Fields */}
          {activeTab === 'additional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Drug License / Pharmacy Reg. No.
                </label>
                <input
                  type="text"
                  value={formData.drugLicenseNo}
                  onChange={(e) => setFormData({ ...formData, drugLicenseNo: e.target.value })}
                  placeholder="DLD-04-XXXXX"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Bank / EasyPaisa / IBAN
                </label>
                <input
                  type="text"
                  value={formData.bankDetails}
                  onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                  placeholder="HBL / Meezan Account No or EasyPaisa"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Internal Remarks / Ledger Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special instructions or ledger reminders..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit(true)}
            className="px-5 py-2.5 rounded-xl border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            Save & New
          </button>
          
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit(false)}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Khata</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPartyModal;
