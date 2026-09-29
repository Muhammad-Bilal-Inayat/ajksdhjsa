import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  Headphones, 
  UserCheck, 
  Lock, 
  ArrowUpRight,
  Globe,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenantPlan } from '../../context/TenantPlanContext';
import { 
  getAssistantPlanLimits, 
  getTodayMessageCount, 
  incrementTodayMessageCount, 
  generateMbiAssistantResponse, 
  trackAiClickEvent, 
  sendLiveChatMessage,
  fetchLiveChatSession
} from '../../lib/assistantKnowledgeService';
import { emitToast } from '../../contexts/ToastContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'human_agent';
  senderName?: string;
  text: string;
  timestamp: string;
  requiresUpgrade?: boolean;
  isHumanEscalation?: boolean;
}

interface InteractiveAiGuideProps {
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
  className?: string;
}

export const InteractiveAiGuide: React.FC<InteractiveAiGuideProps> = ({
  externalPrompt,
  onClearExternalPrompt,
  className = ''
}) => {
  const { currentUser, business, tenant } = useAuth();
  const { rawPlan } = useTenantPlan();

  const activeUserId = currentUser?.uid || 'usr_client';
  const effectivePlan = rawPlan || (tenant as any)?.plan || (business as any)?.plan || 'Business Gold';
  const limits = getAssistantPlanLimits(effectivePlan);

  // Persistent Session ID
  const [sessionId] = useState<string>(() => {
    let saved = localStorage.getItem('mbi_ai_active_session_id');
    if (!saved) {
      saved = `sess_${activeUserId}_${Date.now()}`;
      localStorage.setItem('mbi_ai_active_session_id', saved);
    }
    return saved;
  });

  const [todayCount, setTodayCount] = useState<number>(() => getTodayMessageCount(activeUserId));
  const messagesRemaining = Math.max(0, limits.dailyMessageLimit - todayCount);

  const [sessionStatus, setSessionStatus] = useState<'active_ai' | 'human_escalation_requested' | 'human_active' | 'resolved'>('active_ai');
  const [assignedAgentName, setAssignedAgentName] = useState<string>('');

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'init_welcome',
      role: 'assistant',
      senderName: 'MBI AI Guide',
      text: `Assalam-o-Alaikum ${currentUser?.displayName || currentUser?.email || 'Partner'}! Main MBI AI Guide & Assistant hoon.\n\nAap MBI INVENTRA ke sabhi features (POS Billing, FEFO Batch Expiry, Customer & Supplier Ledgers, Multi-terminal Sync, Thermal Receipts) ke baare me kisi bhi zubaan (Urdu, English, Roman Urdu, Arabic) me sawal pooch sakte hain!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  // Handle external prompt when user clicks a topic chip from PopularTopicsCard
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      handleAsk(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  // Periodic poll of live chat state
  useEffect(() => {
    const syncSession = async () => {
      const serverSession = await fetchLiveChatSession(sessionId, {
        userId: activeUserId,
        userName: currentUser?.displayName || currentUser?.email || 'Partner',
        storeName: tenant?.name || business?.name || 'Pharmacy Store',
        tenantId: tenant?.tenantId || business?.id || 'tenant-01',
        plan: effectivePlan,
        pageContext: 'user'
      });

      if (serverSession) {
        setSessionStatus(serverSession.status);
        if (serverSession.assignedAgentName) {
          setAssignedAgentName(serverSession.assignedAgentName);
        }

        if (serverSession.messages && serverSession.messages.length > 0) {
          const formatted: ChatMessage[] = serverSession.messages.map(m => ({
            id: m.id,
            role: m.sender === 'user' ? 'user' : m.sender === 'human_agent' ? 'human_agent' : 'assistant',
            senderName: m.senderName,
            text: m.text,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isHumanEscalation: m.isEscalation,
            requiresUpgrade: m.requiresUpgrade
          }));
          setChatHistory(formatted);
        }
      }
    };

    syncSession();
    const interval = setInterval(syncSession, 5000);
    return () => clearInterval(interval);
  }, [sessionId, activeUserId, currentUser, tenant, business, effectivePlan]);

  const handleAsk = async (questionText?: string) => {
    const textToSend = questionText || prompt;
    if (!textToSend.trim() || loading) return;

    // Check Plan Limits
    if (messagesRemaining <= 0 && sessionStatus !== 'human_active') {
      setChatHistory(prev => [
        ...prev,
        {
          id: `usr_${Date.now()}`,
          role: 'user',
          text: textToSend,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: `limit_${Date.now()}`,
          role: 'assistant',
          senderName: 'MBI AI Guide',
          text: `⚠️ **Daily Message Limit Reached**\n\nAapke **${limits.planName}** plan ki daily message quota (${limits.dailyMessageLimit} msgs/day) reach ho chuki hai. Limit rozana raat 00:00 AM par reset ho jati hai.\n\nAgli tier par upgrade karne ke liye Settings > Subscription check karein!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          requiresUpgrade: true
        }
      ]);
      setPrompt('');
      return;
    }

    const newCount = incrementTodayMessageCount(activeUserId);
    setTodayCount(newCount);

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    if (!questionText) setPrompt('');
    setLoading(true);

    trackAiClickEvent({
      sessionId,
      eventType: questionText ? 'prompt_chip_click' : 'message_sent',
      eventLabel: textToSend.substring(0, 35),
      userId: activeUserId,
      userName: currentUser?.displayName || currentUser?.email || 'Partner',
      storeName: tenant?.name || business?.name || 'Pharmacy Store',
      tenantId: tenant?.tenantId || business?.id || 'tenant-01',
      userPlan: effectivePlan,
      pageContext: 'user'
    });

    try {
      // 1. Dispatch to live server chat message endpoint
      const serverRes = await sendLiveChatMessage({
        sessionId,
        text: textToSend,
        sender: 'user',
        senderName: currentUser?.displayName || currentUser?.email || 'Partner',
        isEscalation: textToSend.toLowerCase().includes('human') || textToSend.toLowerCase().includes('call') || textToSend.toLowerCase().includes('team'),
        userMeta: {
          userId: activeUserId,
          userName: currentUser?.displayName || currentUser?.email || 'Partner',
          userEmail: currentUser?.email || '',
          storeName: tenant?.name || business?.name || 'Pharmacy Store',
          tenantId: tenant?.tenantId || business?.id || 'tenant-01',
          plan: effectivePlan,
          pageContext: 'user'
        },
        autoAiReply: sessionStatus !== 'human_active'
      });

      if (serverRes.aiMessage) {
        setChatHistory(prev => [
          ...prev,
          {
            id: serverRes.aiMessage!.id,
            role: 'assistant',
            senderName: serverRes.aiMessage!.senderName,
            text: serverRes.aiMessage!.text,
            timestamp: new Date(serverRes.aiMessage!.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isHumanEscalation: serverRes.aiMessage!.isEscalation
          }
        ]);
      } else if (sessionStatus !== 'human_active' && !serverRes.aiMessage) {
        // Local fast-path generator fallback
        const reply = generateMbiAssistantResponse(textToSend, effectivePlan);
        setChatHistory(prev => [
          ...prev,
          {
            id: `ast_${Date.now()}`,
            role: 'assistant',
            senderName: 'MBI AI Guide',
            text: reply.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            requiresUpgrade: reply.requiresUpgrade,
            isHumanEscalation: reply.isHumanEscalation
          }
        ]);
      }
    } catch (err) {
      // Local fallback
      const reply = generateMbiAssistantResponse(textToSend, effectivePlan);
      setChatHistory(prev => [
        ...prev,
        {
          id: `ast_${Date.now()}`,
          role: 'assistant',
          senderName: 'MBI AI Guide',
          text: reply.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          requiresUpgrade: reply.requiresUpgrade,
          isHumanEscalation: reply.isHumanEscalation
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setChatHistory([
      {
        id: 'init_welcome',
        role: 'assistant',
        senderName: 'MBI AI Guide',
        text: `Assalam-o-Alaikum ${currentUser?.displayName || currentUser?.email || 'Partner'}! Chat history reset ho chuki hai. Aap koi bhi sawal pooch sakte hain!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    emitToast('Chat conversation cleared', 'info');
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-[650px] overflow-hidden transition-colors duration-200 ${className}`}>
      
      {/* 1. Header Bar: Polished Dual Theme */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/60 flex items-center justify-center font-black text-xs shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>Interactive AI Guide</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {sessionStatus === 'human_active' ? 'Human Active' : 'Multilingual'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Ask in Urdu, Roman Urdu, English, Hindi, Arabic • {messagesRemaining} msgs remaining today
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear Conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Chat Area: Soft Dual Theme */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
        {chatHistory.map((m) => {
          const isUser = m.role === 'user';
          const isHumanAgent = m.role === 'human_agent';

          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
            >
              {!isUser && (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border ${
                  isHumanAgent
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {isHumanAgent ? <Headphones className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
              )}

              <div
                className={`max-w-[85%] p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed transition-colors ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-md shadow-blue-600/20 font-medium'
                    : isHumanAgent
                    ? 'bg-emerald-800 text-white rounded-tl-xs shadow-md border border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 shadow-sm rounded-tl-xs'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-700/60 text-[10px] font-bold text-slate-400 dark:text-slate-400">
                    <span>{isHumanAgent ? (m.senderName || 'MBI Support Desk') : 'MBI AI Guide'}</span>
                    <span>{m.timestamp}</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap">{m.text}</p>

                {m.requiresUpgrade && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Plan Upgrade Required
                    </span>
                    <a
                      href="/pricing"
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <span>Upgrade Plan</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {isUser && (
                  <span className="block text-[10px] mt-1.5 text-blue-100/70 text-right">
                    {m.timestamp}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs py-2 px-1">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>MBI AI Guide is generating response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Box: Dual-Theme */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 shrink-0 transition-colors">
        <input
          ref={inputRef}
          type="text"
          placeholder="E.g. Batch expiry alert kaise kaam karti hai? Or ask in English/Urdu..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          disabled={loading}
          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-hidden transition-colors shadow-2xs"
        />
        <button
          type="button"
          onClick={() => handleAsk()}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <span>Ask</span>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
