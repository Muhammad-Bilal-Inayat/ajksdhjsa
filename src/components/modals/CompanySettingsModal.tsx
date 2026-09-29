import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Phone, Mail, MapPin, FileText, Upload, 
  Trash2, Save, X, CheckCircle2, ShieldCheck, Globe, 
  Sparkles, CreditCard, Award, Coins, Printer, 
  Lock, Percent, Shield, Clock, AlertTriangle, UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Business } from '../../types';
import { MultiCurrencySection } from '../company/MultiCurrencySection';

export interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'general' | 'contact' | 'tax' | 'invoice' | 'currency';
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({ 
  isOpen, 
  onClose,
  defaultTab = 'general'
}) => {
  const { business, updateBusiness, currentUser, activeRole, tenant } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'tax' | 'invoice' | 'currency'>(defaultTab);
  const [isSaved, setIsSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic initialization from active tenant / business session (never hardcoded defaults)
  const initialStoreName = business?.name || tenant?.name || currentUser?.name || 'My Pharmacy Store';
  const initialAddress = business?.address || (tenant as any)?.address || '';
  const initialCity = business?.city || (tenant as any)?.city || 'Lahore';
  const initialState = business?.state || (tenant as any)?.state || 'Punjab';
  const initialPhone = business?.phone || (tenant as any)?.phone || '';
  const initialMobile = business?.mobile || (tenant as any)?.mobile || (currentUser as any)?.phone || '';
  const initialEmail = business?.email || tenant?.ownerEmail || currentUser?.email || '';
  const initialNtn = business?.taxNumber || (tenant as any)?.taxNumber || '';
  const initialDsl = business?.drugLicenseNo || (tenant as any)?.drugLicenseNo || '';

  const [formData, setFormData] = useState<Partial<Business> & {
    tagline?: string;
    strn?: string;
    fbrPosId?: string;
    pharmacistName?: string;
    drugLicenseExpiry?: string;
    thermalHeader?: string;
    thermalFooter?: string;
  }>({
    name: initialStoreName,
    logo: business?.logo || '',
    phone: initialPhone,
    mobile: initialMobile,
    email: initialEmail,
    website: business?.website || '',
    address: initialAddress,
    city: initialCity,
    state: initialState,
    pincode: business?.pincode || '',
    taxNumber: initialNtn,
    strn: (business as any)?.strn || '',
    fbrPosId: (business as any)?.fbrPosId || '',
    drugLicenseNo: initialDsl,
    pharmacistName: (business as any)?.pharmacistName || '',
    drugLicenseExpiry: (business as any)?.drugLicenseExpiry || '',
    businessType: business?.businessType || 'Retail Pharmacy',
    currency: business?.currency || 'PKR',
    vatPercentage: business?.vatPercentage || 0,
    invoiceTerms: business?.invoiceTerms || '1. Goods once sold will not be returned without original cash receipt.\n2. Refrigerated & biological items are non-returnable.\n3. Expired medicines will not be accepted for return.',
    invoicePrefix: business?.invoicePrefix || 'INV-',
    tagline: (business as any)?.tagline || 'Authentic Healthcare & Patient Care',
    thermalHeader: (business as any)?.thermalHeader || '',
    thermalFooter: (business as any)?.thermalFooter || 'Thank you for shopping! Get well soon.',
  });

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  // Dynamically sync when active business / tenant session updates
  useEffect(() => {
    if (business || tenant) {
      const liveName = business?.name || tenant?.name || currentUser?.name || 'My Pharmacy Store';
      setFormData(prev => ({
        ...prev,
        name: liveName,
        logo: business?.logo || '',
        phone: business?.phone || (tenant as any)?.phone || prev.phone,
        mobile: business?.mobile || (tenant as any)?.mobile || (currentUser as any)?.phone || prev.mobile,
        email: business?.email || tenant?.ownerEmail || currentUser?.email || prev.email,
        website: business?.website || prev.website,
        address: business?.address || (tenant as any)?.address || prev.address,
        city: business?.city || (tenant as any)?.city || prev.city || 'Lahore',
        state: business?.state || (tenant as any)?.state || prev.state || 'Punjab',
        pincode: business?.pincode || prev.pincode,
        taxNumber: business?.taxNumber || (tenant as any)?.taxNumber || prev.taxNumber,
        drugLicenseNo: business?.drugLicenseNo || (tenant as any)?.drugLicenseNo || prev.drugLicenseNo,
        businessType: business?.businessType || prev.businessType || 'Retail Pharmacy',
        currency: business?.currency || prev.currency || 'PKR',
        vatPercentage: business?.vatPercentage ?? prev.vatPercentage,
        invoiceTerms: business?.invoiceTerms || prev.invoiceTerms,
        invoicePrefix: business?.invoicePrefix || prev.invoicePrefix || 'INV-',
      }));
      setLogoPreview(business?.logo || '');
    }
  }, [business, tenant, currentUser, isOpen]);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('File size exceeds 3MB limit. Please upload a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setFormData(prev => ({ ...prev, logo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setFormData(prev => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('Pharmacy / Company name is required');
      return;
    }
    await updateBusiness(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 750);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-all text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-[#131d33] to-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-xs shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-wide">Company & Store Profile</h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {formData.name || 'Store Profile'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">Edit business profile, logo, contact, NTN & invoice headers</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Focused Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 sm:px-6 pt-2 gap-1 sm:gap-2 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none shrink-0">
          
          {/* 1. General & Business Logo */}
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'general' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>General & Logo</span>
          </button>

          {/* 2. Contact & Address */}
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'contact' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>Contact & Address</span>
          </button>

          {/* 3. Tax & Licenses */}
          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'tax' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Tax & Licenses</span>
          </button>

          {/* 4. Invoice Print Headers */}
          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'invoice' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Printer className="w-4 h-4 text-cyan-500" />
            <span>Invoice Branding</span>
          </button>

          {/* 5. Currencies & Rates */}
          <button
            type="button"
            onClick={() => setActiveTab('currency')}
            className={`pb-2.5 sm:pb-3 px-2.5 sm:px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'currency' 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Currencies</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* TAB 1: GENERAL & LOGO */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Logo Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Official Store Logo (Printed on Invoices & Thermal Slips)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Company Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-center p-2">
                        <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-400">No Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLogoUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo</span>
                      </button>
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Recommended: Transparent PNG (Max 3MB).
                    </p>
                  </div>
                </div>
              </div>

              {/* Company Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. My Pharmacy Store"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business Category
                  </label>
                  <select
                    value={formData.businessType || 'Retail Pharmacy'}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Retail Pharmacy">Retail Pharmacy (OTC & Prescriptions)</option>
                    <option value="Surgical & Pharmaceutical Wholesale">Surgical & Pharmaceutical Wholesale</option>
                    <option value="Hospital Inpatient Pharmacy">Hospital / Clinical Pharmacy</option>
                    <option value="General Store & Cosmetics">General Store & Cosmetics</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Tagline / Slogan
                  </label>
                  <input
                    type="text"
                    value={formData.tagline || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="e.g. 24/7 Authentic Medicines & Patient Care"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT & ADDRESS */}
          {activeTab === 'contact' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Phone / Landline
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="042-35800000"
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp / Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-emerald-500" />
                    <input
                      type="text"
                      value={formData.mobile || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="0300-1234567"
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="info@pharmacystore.pk"
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Website
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.website || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://www.pharmacystore.pk"
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Store Physical Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Shop # 12-14, Commercial Center, Main Market"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Lahore / Karachi / Islamabad"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Province / State
                  </label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="Punjab"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TAX & LICENSES */}
          {activeTab === 'tax' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>Drug Regulatory Authority of Pakistan (DRAP) & FBR Sales Tax Compliance Credentials.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Drug Sale License (DSL) No. (Form 9 / 11)
                  </label>
                  <input
                    type="text"
                    value={formData.drugLicenseNo || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, drugLicenseNo: e.target.value }))}
                    placeholder="e.g. 05-LHR-RET-2024"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pharmacist Incharge Name & Reg #
                  </label>
                  <input
                    type="text"
                    value={formData.pharmacistName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, pharmacistName: e.target.value }))}
                    placeholder="e.g. Dr. Ahmad (Pharm-D / Cat-A # 48291)"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    National Tax Number (NTN)
                  </label>
                  <input
                    type="text"
                    value={formData.taxNumber || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxNumber: e.target.value }))}
                    placeholder="e.g. 4839201-7"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sales Tax Reg. No. (STRN / PRA)
                  </label>
                  <input
                    type="text"
                    value={formData.strn || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, strn: e.target.value }))}
                    placeholder="e.g. 32-77-8761-001-92"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Default GST / VAT Rate (%)
                  </label>
                  <div className="relative">
                    <Percent className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.vatPercentage ?? 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, vatPercentage: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    FBR POS Integration Terminal ID
                  </label>
                  <input
                    type="text"
                    value={formData.fbrPosId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fbrPosId: e.target.value }))}
                    placeholder="e.g. POS-LHR-88291"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVOICE BRANDING */}
          {activeTab === 'invoice' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Series Prefix
                  </label>
                  <input
                    type="text"
                    value={formData.invoicePrefix || 'INV-'}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                    placeholder="INV- / PHARM-"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thermal Printer Default Footer Message
                  </label>
                  <input
                    type="text"
                    value={formData.thermalFooter || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, thermalFooter: e.target.value }))}
                    placeholder="Thank you for shopping! Get well soon."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Standard Terms & Return Policy (Printed on Invoices & Thermal Slips)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.invoiceTerms || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceTerms: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-sans"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CURRENCIES & RATES */}
          {activeTab === 'currency' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <MultiCurrencySection />
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isSaved && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Company Profile Saved Successfully!</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
