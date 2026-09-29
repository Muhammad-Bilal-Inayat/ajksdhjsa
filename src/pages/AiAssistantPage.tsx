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
    <div className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-6 antialiased tracking-tight">
      
      {/* 1. Header Banner: Dual-Theme */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-blue-800 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-md shadow-cyan-500/20 shrink-0">
              MBI
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                  MBI AI Guide & Knowledge Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                  Multilingual AI
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Ask anything about Pharmacy POS Billing, Batch Expiry FEFO, Ledgers, or Home Page features in any language!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700 text-xs text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Isolated Pharmacy Tenant Data</span>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): Interactive AI Guide Chat */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <InteractiveAiGuide 
            externalPrompt={activeQuestion}
            onClearExternalPrompt={() => setActiveQuestion('')}
          />
        </div>

        {/* Right Column (4 cols): Human Call Request & Topic Shortcuts */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Direct Callback Card */}
          <CallRequestCard source="AI Guide Page" />

          {/* Popular Topics Quick Prompts */}
          <PopularTopicsCard onSelectQuestion={(q) => setActiveQuestion(q)} />
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPage;
