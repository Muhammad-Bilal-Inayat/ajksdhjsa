import React, { useState } from 'react';
import { 
  Building2, CreditCard, Smartphone, Globe, Copy, 
  Check, ShieldCheck, AlertCircle, Sparkles, QrCode 
} from 'lucide-react';
import { emitToast } from '../../contexts/ToastContext';

export interface PaymentMethodDetails {
  id: 'meezan' | 'ubl' | 'wallets' | 'binance';
  name: string;
  category: 'bank' | 'wallet' | 'crypto';
  badge: string;
  icon: any;
  title: string;
  accountNo?: string;
  iban?: string;
  mobileNo?: string;
  binanceId?: string;
  payNick?: string;
  branch?: string;
  instructions: string;
}

export const OFFICIAL_PAYMENT_CHANNELS: PaymentMethodDetails[] = [
  {
    id: 'meezan',
    name: 'Meezan Bank (Sargodha Branch)',
    category: 'bank',
    badge: 'Official Bank Account',
    icon: Building2,
    title: 'MUHAMMAD BILAL INAYAT',
    accountNo: '14010111536981',
    iban: 'PK85MEZN0014010111536981',
    branch: 'Sargodha Branch, Pakistan',
    instructions: 'Transfer via Meezan Mobile App, ATM, or Online Banking (Raast / IBFT supported).'
  },
  {
    id: 'ubl',
    name: 'United Bank Limited (UBL)',
    category: 'bank',
    badge: 'Secondary Bank Account',
    icon: Building2,
    title: 'M Bilal Inayat',
    accountNo: '010900033910',
    iban: 'PK53UNIL0109000339108343',
    branch: 'UBL Main Branch',
    instructions: 'Transfer via UBL Digital App, Raast instant ID, or any 1Link Member Bank.'
  },
  {
    id: 'wallets',
    name: 'JazzCash / EasyPaisa / NayaPay / SadaPay',
    category: 'wallet',
    badge: 'Instant Mobile Wallets',
    icon: Smartphone,
    title: 'M. Bilal Inayat',
    mobileNo: '03281302636',
    instructions: 'Send money to 0328-1302636 on JazzCash, EasyPaisa, NayaPay, or SadaPay app.'
  },
  {
    id: 'binance',
    name: 'Binance Pay (Crypto / USDT)',
    category: 'crypto',
    badge: 'International / USDT',
    icon: Globe,
    title: 'MBI INVENTRA Official Pay',
    binanceId: '977181706',
    payNick: 'MBI786',
    instructions: 'Send USDT via Binance Pay App to Pay ID: 977181706 (Nickname: MBI786).'
  }
];

interface PaymentAccountsCardProps {
  selectedMethod: string;
  onSelectMethod: (methodId: 'meezan' | 'ubl' | 'wallets' | 'binance') => void;
  payableAmount: number;
}

export const PaymentAccountsCard: React.FC<PaymentAccountsCardProps> = ({
  selectedMethod,
  onSelectMethod,
  payableAmount
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    emitToast(`Copied ${label} to clipboard!`, 'success');
    setTimeout(() => {
      setCopiedField(null);
    }, 2500);
  };

  const activeChannel = OFFICIAL_PAYMENT_CHANNELS.find(c => c.id === selectedMethod) || OFFICIAL_PAYMENT_CHANNELS[0];

  return (
    <div className="space-y-4">
      {/* Payment Channel Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {OFFICIAL_PAYMENT_CHANNELS.map((channel) => {
          const isSelected = channel.id === selectedMethod;
          const Icon = channel.icon;

          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => onSelectMethod(channel.id)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </div>

              <div>
                <h4 className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-950 dark:text-blue-200' : 'text-slate-900 dark:text-slate-200'}`}>
                  {channel.id === 'meezan' ? 'Meezan Bank' : channel.id === 'ubl' ? 'UBL Bank' : channel.id === 'wallets' ? 'Wallets (0328..)' : 'Binance Pay'}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{channel.badge}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Channel Details Box */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <activeChannel.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {activeChannel.name}
              </h3>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Official Account</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Payable:</span>
            <div className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
              PKR {payableAmount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Account Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Account Title */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Account Title</span>
              <p className="text-xs font-black text-slate-900 dark:text-white">{activeChannel.title}</p>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(activeChannel.title, 'Account Title')}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Copy Title"
            >
              {copiedField === 'Account Title' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Account Number or Mobile Number or Binance ID */}
          {activeChannel.accountNo && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Account Number</span>
                <p className="text-xs font-black text-slate-900 dark:text-white font-mono tracking-wider">{activeChannel.accountNo}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeChannel.accountNo!, 'Account Number')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Copy Account Number"
              >
                {copiedField === 'Account Number' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {activeChannel.mobileNo && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Mobile Wallet Number</span>
                <p className="text-xs font-black text-slate-900 dark:text-white font-mono tracking-wider">{activeChannel.mobileNo}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeChannel.mobileNo!, 'Mobile Number')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Copy Mobile Number"
              >
                {copiedField === 'Mobile Number' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {activeChannel.binanceId && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Binance Pay ID</span>
                <p className="text-xs font-black text-slate-900 dark:text-white font-mono tracking-wider">{activeChannel.binanceId}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeChannel.binanceId!, 'Binance ID')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Copy Binance Pay ID"
              >
                {copiedField === 'Binance ID' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* IBAN (for banks) */}
          {activeChannel.iban && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between sm:col-span-2">
              <div className="space-y-0.5 overflow-hidden">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">IBAN (Raast / All Banks)</span>
                <p className="text-xs font-black text-slate-900 dark:text-white font-mono truncate">{activeChannel.iban}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeChannel.iban!, 'IBAN')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0 ml-2"
                title="Copy IBAN"
              >
                {copiedField === 'IBAN' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Binance Pay Nickname */}
          {activeChannel.payNick && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between sm:col-span-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Binance Pay Nickname</span>
                <p className="text-xs font-black text-slate-900 dark:text-white font-mono">{activeChannel.payNick}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeChannel.payNick!, 'Binance Nickname')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0 ml-2"
                title="Copy Nickname"
              >
                {copiedField === 'Binance Nickname' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Instructions Banner */}
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{activeChannel.instructions}</p>
            <p className="text-[11px] text-blue-700 dark:text-blue-400">
              💡 Please take a clear screenshot of the transfer receipt and upload below along with your Transaction ID for 5-minute automated verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentAccountsCard;
