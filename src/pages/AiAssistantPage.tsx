import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  PhoneCall, 
  Layers, 
  ShoppingBag, 
  FileText, 
  Zap, 
  HelpCircle,
  Headphones,
  Globe
} from 'lucide-react';
import { InteractiveAiGuide } from '../components/ai/InteractiveAiGuide';
import { CallRequestCard } from '../components/support/CallRequestCard';
import { PopularTopicsCard } from '../components/support/PopularTopicsCard';
import { useAuth } from '../contexts/AuthContext';
import { useTenantPlan } from '../context/TenantPlanContext';

export const AiAssistantPage: React.FC = () => {
  const { business, currentUser, tenant } = useAuth();
  const { plan, isGold, isPlatinum } = useTenantPlan();
  const [activeQuestion, setActiveQuestion] = useState<string>('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="p-2 sm:p-4 max-w-7xl mx-auto space-y-3.5 antialiased tracking-tight">
      
      {/* 1. Compact Header Banner */}
      <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-blue-800 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-cyan-500/20 shrink-0">
            MBI
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                MBI AI Guide &amp; Knowledge Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                Multilingual AI
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Ask anything about Pharmacy POS Billing, Batch Expiry FEFO, Ledgers, or Home Page features in Urdu, English or Roman Urdu!
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-200 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Isolated Pharmacy Tenant Data</span>
        </div>
      </div>

      {/* 2. Main 1-Screen 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* Left Column (7.5 cols / 65% width): Interactive AI Guide Chat */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          <InteractiveAiGuide 
            externalPrompt={activeQuestion}
            onClearExternalPrompt={() => setActiveQuestion('')}
            className="h-[480px] sm:h-[500px]"
          />
        </div>

        {/* Right Column (4.5 cols / 35% width): Compact Support Shortcuts & Callback */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3 h-[480px] sm:h-[500px] overflow-y-auto custom-scrollbar pr-0.5">
          {/* Quick Guided Topics Accordion */}
          <PopularTopicsCard onSelectQuestion={(q) => setActiveQuestion(q)} />

          {/* Direct Callback Card */}
          <CallRequestCard source="AI Guide Page" />
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPage;

