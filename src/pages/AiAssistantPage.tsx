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
import { getAssistantPlanLimits } from '../lib/assistantKnowledgeService';

export const AiAssistantPage: React.FC = () => {
  const { business, currentUser, tenant } = useAuth();
  const { plan, rawPlan } = useTenantPlan();
  const [activeQuestion, setActiveQuestion] = useState<string>('');

  const displayPlan = rawPlan || plan || (tenant as any)?.plan || 'Free Trial';
  const limits = getAssistantPlanLimits(displayPlan, currentUser?.uid, tenant?.tenantId);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="h-[calc(100vh-105px)] min-h-[500px] max-w-7xl mx-auto flex flex-col p-2 sm:p-3 space-y-2.5 antialiased tracking-tight overflow-hidden">
      
      {/* 1. Ultra-Compact Top Bar (Single-line) */}
      <div className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-xs flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0">
            AI
          </div>
          <div className="flex items-center gap-2 truncate">
            <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
              MBI ERP AI Intelligence &amp; Analytics
            </h1>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 shrink-0">
              Active: {displayPlan} ({limits.dailyMessageLimit} msgs/day)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict Tenant Isolation</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ● Live 24/7
          </span>
        </div>
      </div>

      {/* 2. Main 1-Screen Responsive Viewport (No page scroll) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">
        
        {/* Left Column (Chat box occupying full height of viewport) */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0">
          <InteractiveAiGuide 
            externalPrompt={activeQuestion}
            onClearExternalPrompt={() => setActiveQuestion('')}
            className="h-full flex-1 min-h-0"
          />
        </div>

        {/* Right Column (Side guided solutions + Quick callback) */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-0 gap-2.5 overflow-hidden">
          
          {/* Scrollable Guided Topics Accordion */}
          <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 overflow-y-auto custom-scrollbar shadow-xs">
            <PopularTopicsCard onSelectQuestion={(q) => setActiveQuestion(q)} />
          </div>

          {/* Quick Helpline / Call Request Module at bottom */}
          <div className="shrink-0">
            <CallRequestCard source="AI Guide Page" className="p-3 sm:p-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPage;
