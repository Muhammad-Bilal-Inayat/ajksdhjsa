import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  Headphones, 
  Lock, 
  ArrowUpRight,
  Trash2,
  Copy,
  Check,
  BarChart3,
  TrendingUp,
  Package,
  FileText,
  Users,
  DollarSign
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
import { AssistantTenantDataService } from '../../lib/assistantTenantDataService';
import { emitToast } from '../../contexts/ToastContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'human_agent';
  senderName?: string;
  text: string;
  timestamp: string;
  requiresUpgrade?: boolean;
  isHumanEscalation?: boolean;
  isReport?: boolean;
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
  const { currentUser, business, tenant, activeUser } = useAuth();
  const { rawPlan } = useTenantPlan();

  const activeUserId = activeUser?.id || currentUser?.uid || 'usr_client';
  const tenantId = tenant?.tenantId || tenant?.id || business?.tenantId || business?.id || 'tenant_main';
  const effectivePlan = rawPlan || (tenant as any)?.plan || (business as any)?.plan || 'Trial';
  const limits = getAssistantPlanLimits(effectivePlan, activeUserId, tenantId);
  const userName = activeUser?.name || currentUser?.displayName || currentUser?.email || 'Store Owner';

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
  const [, setAssignedAgentName] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'init_welcome',
      role: 'assistant',
      senderName: 'MBI Intelligent Assistant',
      text: `Assalam-o-Alaikum ${userName}! Welcome to MBI Intelligent ERP Assistant.\n\nI can analyze your sales, generate ledger summaries, inventory audits, profit margins, and custom business reports in real-time.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen to live quota reset/increments from server
  useEffect(() => {
    const handleQuotaUpdate = () => {
      setTodayCount(getTodayMessageCount(activeUserId));
    };
    window.addEventListener('mbi-ai-quota-updated', handleQuotaUpdate);
    window.addEventListener('storage', handleQuotaUpdate);
    return () => {
      window.removeEventListener('mbi-ai-quota-updated', handleQuotaUpdate);
      window.removeEventListener('storage', handleQuotaUpdate);
    };
  }, [activeUserId]);

  // Contained Auto-scroll inside chat box only — prevents window from jumping down
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
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
        userName,
        storeName: tenant?.name || business?.name || 'Pharmacy Store',
        tenantId,
        plan: effectivePlan,
        pageContext: 'user'
      });

      if (serverSession) {
        setSessionStatus(serverSession.status);
        if (serverSession.assignedAgentName) {
          setAssignedAgentName(serverSession.assignedAgentName);
        }

        if (serverSession.messages && serverSession.messages.length > 0) {
          const formatted: ChatMessage[] = serverSession.messages
            .filter(m => !m.text.includes('exclusive to Business and Enterprise plans'))
            .map(m => ({
              id: m.id,
              role: m.sender === 'user' ? 'user' : m.sender === 'human_agent' ? 'human_agent' : 'assistant',
              senderName: m.senderName,
              text: m.text,
              timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isHumanEscalation: m.isEscalation,
              requiresUpgrade: m.requiresUpgrade
            }));
          if (formatted.length > 0) {
            setChatHistory(formatted);
          }
        }
      }
    };

    syncSession();
    const interval = setInterval(syncSession, 6000);
    return () => clearInterval(interval);
  }, [sessionId, activeUserId, userName, tenant, business, tenantId, effectivePlan]);

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
          senderName: 'MBI Intelligent Assistant',
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
      userName,
      storeName: tenant?.name || business?.name || 'Pharmacy Store',
      tenantId,
      userPlan: effectivePlan,
      pageContext: 'user'
    });

    try {
      // 1. Primary Check: Live Scoped ERP Data Analytics Engine
      const tenantReport = await AssistantTenantDataService.analyzeAndGenerateReport(
        textToSend,
        tenantId,
        effectivePlan,
        userName
      );

      if (tenantReport && tenantReport.text) {
        setChatHistory(prev => [
          ...prev,
          {
            id: `ast_${Date.now()}`,
            role: 'assistant',
            senderName: 'MBI ERP Intelligence',
            text: tenantReport.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isReport: true
          }
        ]);
        setLoading(false);
        return;
      }

      // 2. Dispatch to live server chat endpoint
      const serverRes = await sendLiveChatMessage({
        sessionId,
        text: textToSend,
        sender: 'user',
        senderName: userName,
        isEscalation: textToSend.toLowerCase().includes('human') || textToSend.toLowerCase().includes('call') || textToSend.toLowerCase().includes('team'),
        userMeta: {
          userId: activeUserId,
          userName,
          userEmail: currentUser?.email || '',
          storeName: tenant?.name || business?.name || 'Pharmacy Store',
          tenantId,
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
            senderName: serverRes.aiMessage!.senderName || 'MBI Intelligent Assistant',
            text: serverRes.aiMessage!.text,
            timestamp: new Date(serverRes.aiMessage!.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isHumanEscalation: serverRes.aiMessage!.isEscalation
          }
        ]);
      } else if (sessionStatus !== 'human_active') {
        const reply = generateMbiAssistantResponse(textToSend, effectivePlan);
        setChatHistory(prev => [
          ...prev,
          {
            id: `ast_${Date.now()}`,
            role: 'assistant',
            senderName: 'MBI Intelligent Assistant',
            text: reply.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            requiresUpgrade: reply.requiresUpgrade,
            isHumanEscalation: reply.isHumanEscalation
          }
        ]);
      }
    } catch (err) {
      const reply = generateMbiAssistantResponse(textToSend, effectivePlan);
      setChatHistory(prev => [
        ...prev,
        {
          id: `ast_${Date.now()}`,
          role: 'assistant',
          senderName: 'MBI Intelligent Assistant',
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
        senderName: 'MBI Intelligent Assistant',
        text: `Assalam-o-Alaikum ${userName}! Conversation reset ho chuki hai. Aap koi bhi financial report, inventory audit, ya ledger summary pooch sakte hain!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    emitToast('Conversation reset', 'info');
  };

  const handleCopyText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    emitToast('Report copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Markdown Table & Formatting Helper
  const renderMessageContent = (text: string) => {
    if (text.includes('|') && text.includes('---')) {
      const lines = text.split('\n');
      const blocks: React.ReactNode[] = [];
      let tableRows: string[] = [];
      let inTable = false;

      lines.forEach((line, lIdx) => {
        const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');

        if (isTableRow) {
          inTable = true;
          tableRows.push(line);
        } else {
          if (inTable && tableRows.length > 0) {
            blocks.push(renderTableBlock(tableRows, `tbl_${lIdx}`));
            tableRows = [];
            inTable = false;
          }
          if (line.trim()) {
            blocks.push(
              <div key={lIdx} className="mb-2 leading-relaxed">
                {renderInlineFormatting(line)}
              </div>
            );
          }
        }
      });

      if (inTable && tableRows.length > 0) {
        blocks.push(renderTableBlock(tableRows, 'tbl_final'));
      }

      return <div>{blocks}</div>;
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{renderInlineFormatting(text)}</div>;
  };

  const renderTableBlock = (rows: string[], key: string) => {
    if (rows.length < 2) return null;
    const headerRow = rows[0].split('|').map(c => c.trim()).filter(Boolean);
    const bodyRows = rows.slice(2).map(r => r.split('|').map(c => c.trim()).filter(Boolean));

    return (
      <div key={key} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
        <table className="w-full text-left text-xs border-collapse bg-white dark:bg-slate-900">
          <thead>
            <tr className="bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700">
              {headerRow.map((th, i) => (
                <th key={i} className="px-3 py-2 font-bold tracking-tight whitespace-nowrap text-[11px]">
                  {renderInlineFormatting(th)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {bodyRows.map((row, rIdx) => (
              <tr 
                key={rIdx} 
                className={rIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/40'}
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-1.5 text-[11.5px] text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                    {renderInlineFormatting(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInlineFormatting = (str: string) => {
    // Process Bold: **text**
    const parts = str.split(/(\*\*.*?\*\*|\`.*?\`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-bold">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-full min-h-0 overflow-hidden transition-colors duration-200 ${className}`}>
      
      {/* 1. Header Bar: Sleek Enterprise Bar */}
      <div className="p-3 sm:p-3.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-blue-500/20 shrink-0">
            <Bot className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>Enterprise AI Intelligence</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {sessionStatus === 'human_active' ? 'Human Active' : 'Real-time Vault'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                messagesRemaining > 5
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : messagesRemaining > 0
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse'
              }`}>
                {effectivePlan} ({messagesRemaining}/{limits.dailyMessageLimit} quota)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>100% Tenant Isolated • Real-time Scoped Intelligence</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset Conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Chat Area: Contained Scroll with Rich Formatting */}
      <div 
        ref={chatScrollContainerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 bg-slate-50/40 dark:bg-slate-950/40 transition-colors scroll-smooth"
      >
        {chatHistory.map((m) => {
          const isUser = m.role === 'user';
          const isHumanAgent = m.role === 'human_agent';

          return (
            <div
              key={m.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
            >
              {!isUser && (
                <div className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border ${
                  isHumanAgent
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {isHumanAgent ? <Headphones className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
              )}

              <div
                className={`max-w-[90%] sm:max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-[13px] transition-colors ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-md shadow-blue-600/20 font-medium'
                    : isHumanAgent
                    ? 'bg-emerald-800 text-white rounded-tl-xs shadow-md border border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/80 shadow-xs rounded-tl-xs'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-700/60 text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{isHumanAgent ? (m.senderName || 'MBI Support') : (m.senderName || 'MBI Intelligent Assistant')}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyText(m.id, m.text)}
                        className="p-1 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors cursor-pointer"
                        title="Copy Report"
                      >
                        {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <span>{m.timestamp}</span>
                    </div>
                  </div>
                )}

                {renderMessageContent(m.text)}

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
                  <span className="block text-[10px] mt-1 text-blue-100/70 text-right">
                    {m.timestamp}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs py-2 px-1 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>Analyzing isolated tenant vault &amp; compiling intelligence report...</span>
          </div>
        )}
      </div>

      {/* 3. Quick Intelligence Prompts Bar */}
      <div className="px-3 py-2 bg-slate-100/80 dark:bg-slate-900/80 border-t border-slate-200/70 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar shrink-0">
        <span className="text-slate-500 dark:text-slate-400 font-extrabold shrink-0 flex items-center gap-1 text-[10.5px]">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Audit:</span>
        </span>
        {[
          { label: "Today's Sales Summary", prompt: "Generate Today's Complete Sales Summary" },
          { label: 'Top 10 Selling Medicines', prompt: 'Show Top 10 fast-selling medicines report' },
          { label: 'Low Stock & Expiry Audit', prompt: 'Show all low stock medicines below minimum alert' },
          { label: 'Customer Udhar & Khatas', prompt: 'Show total outstanding customer udhar ledger report' },
          { label: 'Profit & Margin Breakdown', prompt: 'Calculate today profit and net margin breakdown' },
          { label: 'Purchases & Payables', prompt: 'Supplier purchases and pending payables breakdown' },
          { label: 'Total Stock Valuation', prompt: 'Calculate pharmacy total stock valuation in Rs' }
        ].map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleAsk(chip.prompt)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 whitespace-nowrap font-semibold transition cursor-pointer text-[10.5px] shadow-2xs"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 4. Input Box: Enterprise Glassmorphism */}
      <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 shrink-0 transition-colors">
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask any sales figure, customer balance, stock audit, or report..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          disabled={loading}
          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-hidden transition-colors shadow-2xs"
        />
        <button
          type="button"
          onClick={() => handleAsk()}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          <span>Ask</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
