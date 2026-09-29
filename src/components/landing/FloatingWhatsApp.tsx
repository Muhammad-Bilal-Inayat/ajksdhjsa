import React from 'react';
import { MessageSquare } from 'lucide-react';

export const FloatingWhatsApp: React.FC = () => {
  const phoneNumber = '923281302636';
  const defaultMessage = encodeURIComponent(
    'Salam! I want to get a demo / start 10-day trial for MBI INVENTRA Pharmacy POS & ERP.'
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3 select-none">
      <a
        href={`https://wa.me/${phoneNumber}?text=${defaultMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all relative group"
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40"></span>
        <MessageSquare className="w-7 h-7 relative z-10 fill-current" />
      </a>
    </div>
  );
};
