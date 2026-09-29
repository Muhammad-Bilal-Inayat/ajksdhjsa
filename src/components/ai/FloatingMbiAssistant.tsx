import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Sparkles, 
  MessageSquare, 
  PhoneCall, 
  UserCheck, 
  RefreshCw, 
  AlertCircle, 
  Shield, 
  Move,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  Headphones,
  User,
  Mic,
  Volume2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getAssistantPlanLimits, 
  getTodayMessageCount, 
  incrementTodayMessageCount, 
  generateMbiAssistantResponse, 
  forwardHumanRequestToServer,
  isHumanSupportRequested,
  trackAiClickEvent,
  fetchLiveChatSession,
  sendLiveChatMessage
} from '../../lib/assistantKnowledgeService';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'human_agent';
  senderName?: string;
  text: string;
  timestamp: string;
  requiresUpgrade?: boolean;
  isHumanEscalation?: boolean;
}

interface FloatingMbiAssistantProps {
  context?: 'home' | 'user';
}

export function FloatingMbiAssistant({ context = 'user' }: FloatingMbiAssistantProps) {
  const { business, currentUser, tenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Visibility toggle state
  const [isAssistantEnabled, setIsAssistantEnabled] = useState(() => {
    const val = localStorage.getItem('mbi_ai_assistant_enabled');
    return val === null ? true : val === 'true';
  });

  useEffect(() => {
    const handleSettingsChanged = () => {
      const val = localStorage.getItem('mbi_ai_assistant_enabled');
      setIsAssistantEnabled(val === null ? true : val === 'true');
    };

    window.addEventListener('mbi-ai-settings-changed', handleSettingsChanged);
    window.addEventListener('storage', handleSettingsChanged);
    return () => {
      window.removeEventListener('mbi-ai-settings-changed', handleSettingsChanged);
      window.removeEventListener('storage', handleSettingsChanged);
    };
  }, []);

  const activeUserId = currentUser?.uid || 'usr_client';
  const effectivePlan = (tenant as any)?.plan || (business as any)?.plan || 'Basic / Free';
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

  // Live Chat Status from Master Server
  const [sessionStatus, setSessionStatus] = useState<'active_ai' | 'human_escalation_requested' | 'human_active' | 'resolved'>('active_ai');
  const [assignedAgentName, setAssignedAgentName] = useState<string>('');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init_1',
      role: 'assistant',
      senderName: 'MBI AI Guide',
      text: context === 'home'
        ? `Assalam-o-Alaikum! Main MBI INVENTRA AI Guide hoon. Main sirf MBI Inventra Pharmacy ERP Software, POS Billing, Inventory, Ledgers, aur Home Page features ke hawale se madad karta hoon.\n\n📊 Daily Message Limit: **${limits.dailyMessageLimit} msgs/day** (${messagesRemaining} remaining)`
        : `Assalam-o-Alaikum ${currentUser?.displayName || currentUser?.email || 'Partner'}! Main aapka MBI AI Guide hoon (${limits.planName} Plan).\n\n📊 Plan Limit: **${limits.dailyMessageLimit} msgs/day** (${messagesRemaining} remaining). Software features ke baare me sawal poochein!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHumanForm, setShowHumanForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [humanSubmitted, setHumanSubmitted] = useState(false);

  // Position state for floating draggable widget with localStorage persistence
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('mbi_ai_widget_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (err) {}
    return { x: 20, y: 120 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync with Master Server Live Chat Session on load & periodic poll
  useEffect(() => {
    if (!isOpen) return;

    // Track Widget Open Click
    trackAiClickEvent({
      sessionId,
      eventType: 'widget_open',
      eventLabel: 'Floating Assistant Opened',
      userId: activeUserId,
      userName: currentUser?.displayName || currentUser?.email || 'Partner',
      storeName: tenant?.name || business?.name || 'Pharmacy Store',
      tenantId: tenant?.tenantId || business?.id || 'tenant-01',
      userPlan: effectivePlan,
      pageContext: context
    });

    const syncSession = async () => {
      const serverSession = await fetchLiveChatSession(sessionId, {
        userId: activeUserId,
        userName: currentUser?.displayName || currentUser?.email || 'Partner',
        storeName: tenant?.name || business?.name || 'Pharmacy Store',
        tenantId: tenant?.tenantId || business?.id || 'tenant-01',
        plan: effectivePlan,
        pageContext: context
      });

      if (serverSession) {
        setSessionStatus(serverSession.status);
        if (serverSession.assignedAgentName) {
          setAssignedAgentName(serverSession.assignedAgentName);
        }

        // If server has more messages or messages from human agent, update UI
        if (serverSession.messages && serverSession.messages.length > 0) {
          const formatted: Message[] = serverSession.messages.map(m => ({
            id: m.id,
            role: m.sender === 'user' ? 'user' : m.sender === 'human_agent' ? 'human_agent' : 'assistant',
            senderName: m.senderName,
            text: m.text,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isHumanEscalation: m.isEscalation,
            requiresUpgrade: m.requiresUpgrade
          }));
          setMessages(formatted);
        }
      }
    };

    syncSession();
    const pollInterval = setInterval(syncSession, 3500);
    return () => clearInterval(pollInterval);
  }, [isOpen, sessionId, activeUserId, currentUser, tenant, business, effectivePlan, context]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle pointer drag
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const deltaX = dragStartRef.current.startX - e.clientX;
    const deltaY = dragStartRef.current.startY - e.clientY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setIsDragging(true);
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 360, dragStartRef.current.initialX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 520, dragStartRef.current.initialY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragStartRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
    localStorage.setItem('mbi_ai_widget_pos', JSON.stringify(position));
    setTimeout(() => setIsDragging(false), 50);
  };

  const sendMessage = async (customText?: string, isEscalationIntent = false) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    // Track prompt chip click if customText provided
    if (customText) {
      trackAiClickEvent({
        sessionId,
        eventType: isEscalationIntent ? 'human_escalate_click' : 'prompt_chip_click',
        eventLabel: customText.substring(0, 30),
        userId: activeUserId,
        userName: currentUser?.displayName || currentUser?.email || 'Partner',
        storeName: tenant?.name || business?.name || 'Pharmacy Store',
        tenantId: tenant?.tenantId || business?.id || 'tenant-01',
        userPlan: effectivePlan,
        pageContext: context
      });
    }

    // Check Daily Quota Limit
    if (messagesRemaining <= 0 && sessionStatus !== 'human_active') {
      setMessages(prev => [
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
          text: `⚠️ **Daily Message Limit Reached**\n\nAapke **${limits.planName}** plan ki daily quota (${limits.dailyMessageLimit} msgs/day) exceed ho chuki hai. Limit aglay din 00:00 AM par reset hogi.\n\n• Basic / Free: 50 msgs/day\n• Business / Pro: 100 msgs/day\n• Enterprise: 500 msgs/day\n\nAap live support team se rabta kar sakte hain!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          requiresUpgrade: true
        }
      ]);
      setInput('');
      return;
    }

    const newCount = incrementTodayMessageCount(activeUserId);
    setTodayCount(newCount);

    const isHumanNeeded = isEscalationIntent || isHumanSupportRequested(textToSend);

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);

    // If human support requested, auto-escalate to Master Server
    if (isHumanNeeded) {
      setSessionStatus('human_escalation_requested');
      forwardHumanRequestToServer({
        userId: activeUserId,
        userName: currentUser?.displayName || currentUser?.email || 'Pharmacist',
        userPhone: (currentUser as any)?.phone || (business as any)?.phone || phone || 'Not provided',
        storeName: tenant?.name || business?.name || 'Pharmacy Store',
        tenantId: tenant?.tenantId || business?.id || 'tenant-01',
        userMessage: textToSend
      });
      setShowHumanForm(true);
    }

    // Sync message to Master API /api/ai/chat/sessions/:sessionId/message
    try {
      const serverRes = await sendLiveChatMessage({
        sessionId,
        text: textToSend,
        sender: 'user',
        senderName: currentUser?.displayName || currentUser?.email || 'Partner',
        isEscalation: isHumanNeeded,
        userMeta: {
          userId: activeUserId,
          userName: currentUser?.displayName || currentUser?.email || 'Partner',
          userPhone: (currentUser as any)?.phone || (business as any)?.phone || phone || '',
          userEmail: currentUser?.email || '',
          storeName: tenant?.name || business?.name || 'Pharmacy Store',
          tenantId: tenant?.tenantId || business?.id || 'tenant-01',
          plan: effectivePlan,
          pageContext: context
        },
        autoAiReply: sessionStatus !== 'human_active'
      });

      if (serverRes.aiMessage) {
        setMessages(prev => [
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
        // Fallback local response
        const reply = generateMbiAssistantResponse(textToSend, effectivePlan);
        setMessages(prev => [
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
    } catch (e) {
      // Local fallback
      const reply = generateMbiAssistantResponse(textToSend, effectivePlan);
      setMessages(prev => [
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

  const handleHumanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    trackAiClickEvent({
      sessionId,
      eventType: 'phone_click',
      eventLabel: `Phone submitted: ${phone}`,
      userId: activeUserId,
      userName: currentUser?.displayName || currentUser?.email || 'Pharmacist Client',
      storeName: tenant?.name || business?.name || 'Pharmacy Client',
      tenantId: tenant?.tenantId || business?.id || 'tenant-01',
      userPlan: effectivePlan,
      pageContext: context
    });

    forwardHumanRequestToServer({
      userId: activeUserId,
      userName: currentUser?.displayName || currentUser?.email || 'Pharmacist Client',
      userPhone: phone,
      storeName: tenant?.name || business?.name || 'Pharmacy Client',
      tenantId: tenant?.tenantId || business?.id || 'tenant-01',
      userMessage: messages.filter(m => m.role === 'user').pop()?.text || 'Direct human callback request'
    });

    setHumanSubmitted(true);
    setTimeout(() => {
      setShowHumanForm(false);
      setHumanSubmitted(false);
      setPhone('');
    }, 3000);
  };

  if (!isAssistantEnabled) return null;

  const quickPrompts = limits.hasAdvancedModules
    ? [
        "POS Billing & F2 shortcut",
        "Shift Management & Cashier closing",
        "Inventory Sync across branches",
        "Customer Udhaar Ledger entry",
        "Human / Team se rabta karein"
      ]
    : [
        "POS Billing & F2 shortcut",
        "Batch Expiry & FEFO tracking",
        "Shift Management unlock kaise karein?",
        "Multi-Branch Sync unlock kaise karein?",
        "Human / Team se rabta karein"
      ];

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            right: `${position.x}px`,
            bottom: `${position.y}px`
          }}
          className="fixed z-50 p-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer border border-white/20 select-none"
          title="Open MBI AI Guide & Live Support"
        >
          <div className="relative">
            {sessionStatus === 'human_active' ? (
              <UserCheck className="w-5 h-5 text-emerald-300" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
            )}
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-white"></span>
          </div>
          <span className="text-xs font-bold tracking-wide pr-1 hidden sm:inline">
            {sessionStatus === 'human_active' ? 'Live Support Active' : 'MBI AI Guide'}
          </span>
        </button>
      )}

      {/* Floating Assistant Drawer Window */}
      {isOpen && (
        <div
          style={{
            right: `${position.x}px`,
            bottom: `${position.y}px`
          }}
          className="fixed z-50 w-[92vw] sm:w-[380px] h-[540px] max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200 text-slate-100"
        >
          {/* Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`px-4 py-3 text-white flex items-center justify-between shadow-md shrink-0 cursor-grab active:cursor-grabbing select-none ${
              sessionStatus === 'human_active'
                ? 'bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800'
                : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700'
            }`}
          >
            <div className="flex items-center gap-2.5 pointer-events-none">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30">
                {sessionStatus === 'human_active' ? (
                  <Headphones className="w-4.5 h-4.5 text-white" />
                ) : (
                  <Bot className="w-4.5 h-4.5 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold tracking-tight">
                    {sessionStatus === 'human_active' ? 'MBI Live Support Desk' : 'MBI Inventra AI Guide'}
                  </h3>
                  <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full border ${
                    sessionStatus === 'human_active'
                      ? 'bg-emerald-400/40 text-emerald-100 border-emerald-300/50'
                      : 'bg-emerald-400/30 text-emerald-100 border-emerald-300/40'
                  }`}>
                    {sessionStatus === 'human_active' ? 'Human Active' : 'Live'}
                  </span>
                </div>
                <p className="text-[10px] text-blue-100/90 font-medium">
                  {sessionStatus === 'human_active'
                    ? `Agent: ${assignedAgentName || 'MBI Support Team'}`
                    : `${limits.planName} Plan • ${messagesRemaining}/${limits.dailyMessageLimit} msgs left`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Minimize / Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Agent Banner if Active */}
          {sessionStatus === 'human_active' && (
            <div className="bg-emerald-950/80 border-b border-emerald-700/50 px-3.5 py-1.5 text-[11px] text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span><strong>Connected to Human Support:</strong> {assignedAgentName || 'MBI Server'}</span>
              </div>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-900/95 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isHumanAgent = msg.role === 'human_agent';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1 px-1 text-[9px] text-slate-400">
                    {isHumanAgent ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> {msg.senderName || 'Support Agent (MBI Server)'}
                      </span>
                    ) : isUser ? (
                      <span>You</span>
                    ) : (
                      <span className="text-purple-300 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> MBI AI Guide
                      </span>
                    )}
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[88%] rounded-2xl p-3 shadow-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                        : isHumanAgent
                        ? 'bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-tl-none border border-emerald-600/50 shadow-emerald-900/20'
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                    }`}
                  >
                    {msg.text}

                    {msg.requiresUpgrade && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Upgrade to access
                        </span>
                        <a
                          href="#pricing"
                          onClick={() => {
                            trackAiClickEvent({
                              sessionId,
                              eventType: 'plan_upgrade_click',
                              eventLabel: 'Upgrade Plan Clicked from AI',
                              userId: activeUserId,
                              userPlan: effectivePlan
                            });
                            setIsOpen(false);
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-colors"
                        >
                          <span>Upgrade Plan</span>
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    {msg.isHumanEscalation && (
                      <div className="mt-2.5 pt-2 border-t border-emerald-800 text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Connected with Master Server Live Support</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                <span className="text-[11px]">
                  {sessionStatus === 'human_active' ? 'Sending to support agent...' : 'MBI AI Guide is typing...'}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Human Support Request Popup */}
          {showHumanForm && (
            <div className="p-3 bg-amber-950/50 border-t border-amber-500/30 text-amber-200 text-xs">
              {humanSubmitted ? (
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <UserCheck className="w-4 h-4" />
                  <span>Request Sent to Server! Support engineer will call you shortly.</span>
                </div>
              ) : (
                <form onSubmit={handleHumanSubmit} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1 text-amber-300">
                      <PhoneCall className="w-3.5 h-3.5" /> Connect with Human Team
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHumanForm(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-300/80">
                    Aapka message Server support desk par log ho chuka hai. Direct call / WhatsApp ke liye phone number darj karein:
                  </p>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. 0336-4585863"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="flex-1 bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Call Me
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Quick Chips */}
          <div className="p-2 bg-slate-950 border-t border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((qp, idx) => {
              const isHumanChip = qp.includes('Human') || qp.includes('rabta');
              return (
                <button
                  key={idx}
                  onClick={() => sendMessage(qp, isHumanChip)}
                  disabled={loading}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] border transition-colors cursor-pointer ${
                    isHumanChip
                      ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-800/80 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {qp}
                </button>
              );
            })}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              placeholder={sessionStatus === 'human_active' ? "Type message to Support Agent..." : "Ask about MBI Inventra software..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl disabled:opacity-50 transition-all shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
