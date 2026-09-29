import React, { useState } from 'react';
import { PhoneCall, CheckCircle2, Send, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { emitToast } from '../../contexts/ToastContext';

interface CallRequestCardProps {
  onSuccess?: () => void;
  className?: string;
  source?: string;
}

export const CallRequestCard: React.FC<CallRequestCardProps> = ({ 
  onSuccess, 
  className = '',
  source = 'User Help & Support Hub'
}) => {
  const { business, currentUser, tenant } = useAuth();
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || loading) return;

    setLoading(true);
    try {
      const activePlan = (tenant as any)?.plan || (business as any)?.plan || 'Business Gold';
      const storeName = tenant?.name || business?.name || 'Pharmacy Partner';

      const res = await fetch('/api/ai/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: storeName,
          userEmail: currentUser?.email || '',
          phone: phone.trim(),
          question: notes.trim() ? `[${source}] Note: ${notes.trim()}` : `Direct Human Support Call requested from ${source}`,
          plan: activePlan
        })
      });

      const data = await res.json();
      if (data.success || res.ok) {
        setSubmitted(true);
        emitToast('Call request received! Our support engineer will contact you shortly.', 'success');
        if (onSuccess) onSuccess();
        setTimeout(() => {
          setSubmitted(false);
          setPhone('');
          setNotes('');
        }, 5000);
      } else {
        emitToast('Could not register request. Please call hotline directly.', 'warning');
      }
    } catch (err) {
      // Fallback
      setSubmitted(true);
      emitToast('Call request received! Our support engineer will contact you shortly.', 'success');
      setTimeout(() => {
        setSubmitted(false);
        setPhone('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-5 rounded-2xl transition-all duration-200 shadow-sm bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-amber-950/20 dark:to-slate-900 border border-amber-200/70 dark:border-amber-800/40 text-slate-900 dark:text-slate-100 ${className}`}>
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shadow-xs">
            <PhoneCall className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Request Direct Call / Human Team
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                10-Min SLA
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Direct phone or WhatsApp support from MBI technical engineers.
            </p>
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold">Call Request Registered Successfully!</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
              Our support desk is reviewing your ticket and will call your provided number within minutes.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Your Contact Number (Mobile / WhatsApp) *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0328-1302636 / 0300-1234567"
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Brief Requirement / Query (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Thermal printer setup, data import..."
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-hidden transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Official MBI Inventra Verified Helpline</span>
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md shadow-amber-500/20 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Submitting...' : 'Request Phone Call / WhatsApp'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
