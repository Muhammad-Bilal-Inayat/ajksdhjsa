import React, { useState } from 'react';
import { 
  Headphones, 
  Phone, 
  MessageSquare, 
  Mail, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink,
  Bot,
  Layers,
  HelpCircle,
  FileQuestion,
  PhoneCall,
  CheckCircle2
} from 'lucide-react';
import { InteractiveAiGuide } from '../components/ai/InteractiveAiGuide';
import { CallRequestCard } from '../components/support/CallRequestCard';
import { PopularTopicsCard } from '../components/support/PopularTopicsCard';
import { getBrandContact } from '../lib/siteCmsService';

export const HelpDeskPage: React.FC = () => {
  const [contact] = useState(() => getBrandContact());
  const [activeTab, setActiveTab] = useState<'ai_guide' | 'direct_call' | 'faq'>('ai_guide');
  const [selectedQuestion, setSelectedQuestion] = useState('');

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-6 antialiased tracking-tight">
      
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-md shadow-blue-500/20 shrink-0">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                  Help Desk & Enterprise Support Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  24/7 Available
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Direct helpline access, WhatsApp engineering desk, and instant multilingual AI resolution.
              </p>
            </div>
          </div>

          {/* Quick Helpline Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://wa.me/${contact.whatsapp?.replace(/[^0-9]/g, '') || '923281302636'}?text=${encodeURIComponent('Salam MBI Support Team, I need assistance with my pharmacy ERP software.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Helpline</span>
            </a>

            <a
              href={`tel:${contact.phone || '0328-1302636'}`}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4 text-blue-400" />
              <span>{contact.phone || '0328-1302636'}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Support Direct Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-100 dark:border-slate-700">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Direct Phone</div>
            <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
              {contact.phone || '0328-1302636'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Mon – Sun (9:00 AM – 11:00 PM)
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-100 dark:border-slate-700">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Desk</div>
            <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
              {contact.whatsapp || '0328-1302636'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Instant response & media attachments
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-100 dark:border-slate-700">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Technical Email</div>
            <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
              {contact.email || 'support@mbiinventra.com'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Official enterprise SLA support
            </div>
          </div>
        </div>
      </div>

      {/* Main Full-Width Interactive AI Guide */}
      <div className="w-full">
        <InteractiveAiGuide 
          externalPrompt={selectedQuestion}
          onClearExternalPrompt={() => setSelectedQuestion('')}
        />
      </div>

      {/* Support & Quick Topics Below Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8">
          <PopularTopicsCard onSelectQuestion={(q) => setSelectedQuestion(q)} />
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <CallRequestCard source="Help Desk Page" />
        </div>
      </div>
    </div>
  );
};

export default HelpDeskPage;
