import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  MessageSquare, 
  MousePointerClick, 
  Activity, 
  ShieldCheck, 
  Send, 
  User, 
  UserCheck, 
  AlertCircle, 
  PhoneCall, 
  RefreshCw, 
  Sparkles, 
  Key, 
  CheckCircle2, 
  Clock, 
  Search, 
  TrendingUp, 
  Power, 
  Smartphone, 
  ExternalLink, 
  Trash2, 
  Zap, 
  Check, 
  Sliders, 
  ShieldAlert,
  Headphones,
  CheckCheck,
  Building2,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

interface KeyHealthMetric {
  key: string;
  maskedKey: string;
  status: 'Healthy' | 'Rate-Limited' | 'Error' | 'Unverified';
  requestsCount: number;
  errorCount: number;
  lastUsed: string;
  lastError?: string;
}

interface AiConfigStatus {
  isAiEnabledGlobally: boolean;
  allowedPlans: {
    basic: boolean;
    business: boolean;
    enterprise: boolean;
  };
  homePageEnabled: boolean;
  autoGreeting?: string;
  humanSupportNumber?: string;
  keyCount: number;
  activeKeyIndex: number;
  keyHealthMetrics: KeyHealthMetric[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'human_agent';
  senderName: string;
  text: string;
  timestamp: string;
  isEscalation?: boolean;
  requiresUpgrade?: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  storeName: string;
  tenantId: string;
  plan: string;
  pageContext: 'home' | 'user' | 'store' | 'checkout';
  status: 'active_ai' | 'human_escalation_requested' | 'human_active' | 'resolved';
  isHumanAssigned: boolean;
  assignedAgentName?: string;
  totalClicks: number;
  unreadCountForServer: number;
  unreadCountForUser: number;
  lastMessage: string;
  lastMessageSender: 'user' | 'ai' | 'human_agent';
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface ClickEvent {
  id: string;
  sessionId: string;
  eventType: string;
  eventLabel: string;
  userId?: string;
  userName?: string;
  storeName?: string;
  tenantId?: string;
  userPlan?: string;
  pageContext?: string;
  timestamp: string;
  ip?: string;
}

interface TelemetryAnalytics {
  totalClicks: number;
  todayClicks: number;
  last24hClicks: number;
  eventTypeCounts: Record<string, number>;
  pageContextCounts: Record<string, number>;
  topStores: Array<{ name: string; count: number }>;
  sessionsOverview: {
    totalSessions: number;
    activeSessionsCount: number;
    pendingHumanEscalations: number;
    activeHumanChats: number;
    resolvedSessionsCount: number;
  };
  recentEvents: ClickEvent[];
}

interface AiHumanSupportMasterHubProps {
  onNotify?: (message: string) => void;
}

export const AiHumanSupportMasterHub: React.FC<AiHumanSupportMasterHubProps> = ({ onNotify }) => {
  // Navigation tabs inside the AI Hub
  const [hubTab, setHubTab] = useState<'live_chat' | 'tickets' | 'analytics' | 'settings'>('live_chat');
  
  // Data states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'pending' | 'contacted' | 'resolved'>('all');
  const [analytics, setAnalytics] = useState<TelemetryAnalytics | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search
  const [sessionFilter, setSessionFilter] = useState<'all' | 'pending_human' | 'human_active' | 'active_ai' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Operator manual reply input
  const [operatorReplyText, setOperatorReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem('mbi_server_operator_name') || 'MBI Server Support Team');

  // Settings form states
  const [isGlobalOn, setIsGlobalOn] = useState(true);
  const [homeOn, setHomeOn] = useState(true);
  const [plans, setPlans] = useState({ basic: false, business: true, enterprise: true });
  const [customGreeting, setCustomGreeting] = useState('');
  const [supportPhone, setSupportPhone] = useState('+92 300 1234567');
  const [keys, setKeys] = useState<string[]>([]);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Selected session object
  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0] || null;

  useEffect(() => {
    fetchAllHubData();
    // Live polling every 4 seconds for real-time human chat & clicks sync
    const interval = setInterval(() => {
      fetchSessionsAndAnalyticsSilently();
    }, 4000);
    return () => clearInterval(interval);
  }, [sessionFilter]);

  // Auto-scroll messages when active conversation updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, activeSession?.id]);

  const fetchAllHubData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSessions(),
        fetchSupportTickets(),
        fetchAnalytics(),
        fetchSettings()
      ]);
    } catch (e) {
      console.error('Error loading AI Support Hub data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportTickets = async () => {
    try {
      const res = await fetch('/api/support/tickets');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tickets)) {
          setSupportTickets(data.tickets);
          return;
        }
      }
      // Fallback
      const fbRes = await fetch('/api/ai/leads');
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        if (fbData.success && Array.isArray(fbData.leads)) {
          setSupportTickets(fbData.leads);
        }
      }
    } catch (e) {}
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setSupportTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, status } : t)));
      onNotify?.(`Ticket marked as ${status}`);
    } catch (e) {}
  };

  const fetchSessionsAndAnalyticsSilently = async () => {
    try {
      await Promise.all([
        fetchSessions(true),
        fetchSupportTickets(),
        fetchAnalytics(true)
      ]);
    } catch (e) {}
  };

  const fetchSessions = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const url = sessionFilter === 'all' 
        ? '/api/ai/chat/sessions' 
        : `/api/ai/chat/sessions?filter=${sessionFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          if (!selectedSessionId && data.sessions.length > 0) {
            setSelectedSessionId(data.sessions[0].id);
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching chat sessions:', e);
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  const fetchAnalytics = async (silent = false) => {
    try {
      const res = await fetch('/api/ai/telemetry/analytics');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.analytics) {
          setAnalytics(data.analytics);
        }
      }
    } catch (e) {}
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/ai/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.status) {
          setAiConfig(data.status);
          setIsGlobalOn(data.status.isAiEnabledGlobally);
          setHomeOn(data.status.homePageEnabled);
          setPlans(data.status.allowedPlans);
          setCustomGreeting(data.status.autoGreeting || '');
          setSupportPhone(data.status.humanSupportNumber || '+92 300 1234567');
        }
      }
    } catch (e) {}
  };

  const handleSendOperatorReply = async (cannedText?: string) => {
    const textToSend = cannedText || operatorReplyText;
    if (!textToSend.trim() || !activeSession || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/ai/chat/sessions/${activeSession.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'human_agent',
          senderName: operatorName,
          text: textToSend.trim(),
          autoAiReply: false
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOperatorReplyText('');
          // Update local session
          setSessions(prev => prev.map(s => s.id === activeSession.id ? data.session : s));
          onNotify?.(`Support reply sent to ${activeSession.userName || 'Client'}!`);
        }
      }
    } catch (e) {
      onNotify?.('Failed to send reply. Please retry.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (sessionId: string, newStatus: 'human_active' | 'resolved' | 'active_ai') => {
    try {
      const res = await fetch(`/api/ai/chat/sessions/${sessionId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          agentName: operatorName
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSessions(prev => prev.map(s => s.id === sessionId ? data.session : s));
          const label = newStatus === 'human_active' ? 'Human Support Assigned' : newStatus === 'resolved' ? 'Chat Resolved' : 'Returned to AI Bot';
          onNotify?.(`Session status updated: ${label}`);
        }
      }
    } catch (e) {}
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this conversation session?')) return;
    try {
      const res = await fetch(`/api/ai/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
        }
        onNotify?.('Chat session deleted.');
      }
    } catch (e) {}
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAiEnabledGlobally: isGlobalOn,
          homePageEnabled: homeOn,
          allowedPlans: plans,
          autoGreeting: customGreeting,
          humanSupportNumber: supportPhone,
          customKeys: keys.length > 0 ? keys : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAiConfig(data.status);
          onNotify?.('AI Assistant & Support settings saved successfully!');
        }
      }
    } catch (e) {
      onNotify?.('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestKey = async (key: string) => {
    setTestingKey(key);
    try {
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      const data = await res.json();
      if (data.success && data.result) {
        onNotify?.(`Key Ping Test: ${data.result.message}`);
        fetchSettings();
      }
    } catch (e) {
      onNotify?.('Key test failed.');
    } finally {
      setTestingKey(null);
    }
  };

  // Filtered session list
  const filteredSessions = sessions.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.userName && s.userName.toLowerCase().includes(q)) ||
      (s.storeName && s.storeName.toLowerCase().includes(q)) ||
      (s.userPhone && s.userPhone.includes(q)) ||
      (s.lastMessage && s.lastMessage.toLowerCase().includes(q))
    );
  });

  const pendingEscalationsCount = sessions.filter(s => s.status === 'human_escalation_requested').length;
  const activeHumanCount = sessions.filter(s => s.status === 'human_active').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* TOP HERO HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/30 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  AI Assistant &amp; Live Human Support Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Master Sync Active</span>
                </span>
                {pendingEscalationsCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-bounce shadow-md flex items-center gap-1">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>{pendingEscalationsCount} Pending Support Ticket{pendingEscalationsCount > 1 ? 's' : ''}</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Real-time user clicks tracker, live chat takeover desk, multi-key AI engine health, and instant human operator manual chat sync.
              </p>
            </div>
          </div>

          {/* Quick Refresh & Operator Identity */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Operator:</span>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => {
                  setOperatorName(e.target.value);
                  localStorage.setItem('mbi_server_operator_name', e.target.value);
                }}
                className="bg-transparent text-white font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-36"
                placeholder="Agent Name"
              />
            </div>

            <button
              onClick={() => fetchAllHubData()}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* STATS METRIC TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Clicks</span>
              <MousePointerClick className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {analytics?.totalClicks || 0}
            </div>
            <div className="text-[11px] text-cyan-400 font-medium mt-0.5">
              +{analytics?.todayClicks || 0} today
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Live Chats</span>
              <MessageSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {sessions.length}
            </div>
            <div className="text-[11px] text-indigo-300 font-medium mt-0.5">
              {activeHumanCount} in human desk
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Need Support</span>
              <Headphones className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
              {pendingEscalationsCount}
            </div>
            <div className="text-[11px] text-rose-300 font-medium mt-0.5">
              Instant takeover ready
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>AI Engine</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {isGlobalOn ? 'ONLINE' : 'OFFLINE'}
            </div>
            <div className="text-[11px] text-emerald-300 font-medium mt-0.5">
              {aiConfig?.keyCount || 3} keys pool
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/60 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Widget Opens</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-300 mt-1">
              {analytics?.eventTypeCounts?.widget_open || 0}
            </div>
            <div className="text-[11px] text-purple-300 font-medium mt-0.5">
              {analytics?.eventTypeCounts?.prompt_chip_click || 0} prompt chips
            </div>
          </div>
        </div>
      </div>

      {/* HUB NAVIGATION BAR */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setHubTab('live_chat')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              hubTab === 'live_chat'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Live Human Chat Desk</span>
            {pendingEscalationsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {pendingEscalationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setHubTab('tickets');
              fetchSupportTickets();
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              hubTab === 'tickets'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Support Tickets &amp; Leads</span>
            {supportTickets.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                {supportTickets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setHubTab('analytics')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              hubTab === 'analytics'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MousePointerClick className="w-4 h-4" />
            <span>AI Clicks &amp; Telemetry</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {analytics?.totalClicks || 0}
            </span>
          </button>

          <button
            onClick={() => setHubTab('settings')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              hubTab === 'settings'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Engine &amp; Multi-Key Health</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LIVE HUMAN CHAT DESK & MANUAL OPERATOR TAKEOVER */}
      {/* ========================================================= */}
      {hubTab === 'live_chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px]">
          {/* SESSIONS LIST SIDEBAR (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
            {/* Sidebar Top Search & Filter */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, store, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                <button
                  onClick={() => setSessionFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition ${
                    sessionFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  All ({sessions.length})
                </button>
                <button
                  onClick={() => setSessionFilter('pending_human')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition flex items-center gap-1 ${
                    sessionFilter === 'pending_human'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
                  }`}
                >
                  <span>Need Support</span>
                  {pendingEscalationsCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  )}
                </button>
                <button
                  onClick={() => setSessionFilter('human_active')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition ${
                    sessionFilter === 'human_active'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                  }`}
                >
                  Human Active ({activeHumanCount})
                </button>
                <button
                  onClick={() => setSessionFilter('resolved')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition ${
                    sessionFilter === 'resolved'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Resolved
                </button>
              </div>
            </div>

            {/* Sessions Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[520px]">
              {filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Bot className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-slate-500">No chat sessions found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">When users talk to AI Assistant or click Human Support, chats appear here live.</p>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isSelected = activeSession?.id === session.id;
                  const isPendingSupport = session.status === 'human_escalation_requested';
                  const isHumanHandling = session.status === 'human_active';

                  return (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`p-3.5 cursor-pointer transition-all relative ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                            isPendingSupport ? 'bg-rose-500 animate-pulse' : isHumanHandling ? 'bg-emerald-600' : 'bg-indigo-600'
                          }`}>
                            {isPendingSupport ? <Headphones className="w-4 h-4" /> : isHumanHandling ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {session.userName || 'Pharmacy User'}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {session.storeName || 'Pharmacy Store'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400">
                            {new Date(session.lastMessageAt || session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {session.unreadCountForServer > 0 && (
                            <div className="mt-1">
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white">
                                {session.unreadCountForServer} new
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-1.5 font-sans">
                        {session.lastMessage || 'Started conversation'}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {session.plan || 'Business'}
                        </span>

                        {isPendingSupport && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                            <span>Pending Human Support</span>
                          </span>
                        )}

                        {isHumanHandling && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            <span>Handled by {session.assignedAgentName || 'Agent'}</span>
                          </span>
                        )}

                        {session.status === 'resolved' && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                            Resolved
                          </span>
                        )}

                        <span className="ml-auto text-slate-400">
                          {session.totalClicks || 1} clicks
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ACTIVE CHAT CONVERSATION VIEW & DIRECT REPLY DESK (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
            {activeSession ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                      {activeSession.userName ? activeSession.userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">
                          {activeSession.userName || 'Pharmacy Client'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {activeSession.plan || 'Business Plan'}
                        </span>
                        {activeSession.status === 'human_escalation_requested' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500 text-white animate-pulse">
                            Needs Human Assistance
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{activeSession.storeName || 'Pharmacy Store'}</span>
                        {activeSession.userPhone && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{activeSession.userPhone}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>Session: {activeSession.id.substring(0, 14)}...</span>
                      </p>
                    </div>
                  </div>

                  {/* Header Action Controls */}
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                    {activeSession.userPhone && (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${activeSession.userPhone}`}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 text-xs font-bold hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Call Back</span>
                        </a>
                        <a
                          href={`https://wa.me/${activeSession.userPhone.replace(/[^0-9]/g, '')}?text=Assalam-o-Alaikum!%20Main%20MBI%20Inventra%20Sargodha%20Master%20Support%20se%20rabta%20kar%20raha%20hoon.`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Open WhatsApp Chat</span>
                        </a>
                      </div>
                    )}

                    {activeSession.status !== 'human_active' ? (
                      <button
                        onClick={() => handleUpdateStatus(activeSession.id, 'human_active')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Take Over (Human Agent)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(activeSession.id, 'active_ai')}
                        className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-xs font-bold hover:bg-purple-200 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>Return to AI Bot</span>
                      </button>
                    )}

                    {activeSession.status !== 'resolved' ? (
                      <button
                        onClick={() => handleUpdateStatus(activeSession.id, 'resolved')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(activeSession.id, 'active_ai')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer"
                      >
                        Re-Open
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteSession(activeSession.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status Alert Banner if Human Support is active/pending */}
                {activeSession.status === 'human_escalation_requested' && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/50 px-4 py-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span><strong>Customer requested Human Support:</strong> Type a message below to take over and reply directly.</span>
                    </div>
                    <button
                      onClick={() => handleSendOperatorReply('Assalam-o-Alaikum! Main MBI Server Support Desk se baat kar raha hoon. Main aapki kya madad kar sakta hoon?')}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-500 shrink-0 cursor-pointer shadow-xs"
                    >
                      Instant Greet &amp; Takeover
                    </button>
                  </div>
                )}

                {activeSession.status === 'human_active' && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/50 px-4 py-2 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span><strong>Live Human Support Mode Active:</strong> Customer sees replies from <em>"{activeSession.assignedAgentName || operatorName}"</em> in real time.</span>
                  </div>
                )}

                {/* Messages Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/30 dark:bg-slate-950/20 max-h-[380px]">
                  {activeSession.messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    const isAgent = msg.sender === 'human_agent';
                    const isAi = msg.sender === 'ai';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                          {isUser ? (
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <User className="w-3 h-3" /> {activeSession.userName || 'Client'}
                            </span>
                          ) : isAgent ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <UserCheck className="w-3 h-3" /> {msg.senderName || 'Support Agent (Server)'}
                            </span>
                          ) : (
                            <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> MBI AI Guide
                            </span>
                          )}
                          <span>•</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-sans leading-relaxed shadow-xs ${
                            isUser
                              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
                              : isAgent
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm shadow-emerald-600/10'
                              : 'bg-gradient-to-r from-indigo-900 to-purple-900 text-purple-50 border border-purple-700/50 rounded-tr-sm'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                          {msg.isEscalation && (
                            <div className="mt-2 pt-1.5 border-t border-rose-400/30 text-[10px] text-rose-200 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Escalation requested</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Canned Responses Bar */}
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  <span className="text-slate-400 text-[10px] font-bold uppercase shrink-0 px-1">Quick:</span>
                  <button
                    onClick={() => handleSendOperatorReply('Assalam-o-Alaikum! Main MBI Server Support se baat kar raha hoon, batayein main aapki kya madad kar sakta hoon?')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition"
                  >
                    👋 Greet
                  </button>
                  <button
                    onClick={() => handleSendOperatorReply('Ji bilkul, main aapke system ki database aur subscription settings check kar raha hoon. 1 minute dein.')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition"
                  >
                    🔍 Checking System
                  </button>
                  <button
                    onClick={() => handleSendOperatorReply('Aapka masla hal ho chuka hai! Ek dafa page refresh (F5) karein.')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition"
                  >
                    ✅ Issue Resolved
                  </button>
                  <button
                    onClick={() => handleSendOperatorReply('Kindly maslay ka screenshot hamare WhatsApp number 0300-1234567 par send karein.')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer transition"
                  >
                    📱 Send Screenshot
                  </button>
                </div>

                {/* Operator Manual Reply Input */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Type manual support reply as ${operatorName}... (Press Enter to Send)`}
                    value={operatorReplyText}
                    onChange={(e) => setOperatorReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendOperatorReply();
                      }
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleSendOperatorReply()}
                    disabled={!operatorReplyText.trim() || sendingReply}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <Headphones className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Select a Conversation</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Choose an active user session from the left sidebar to view message history and reply manually as a live support agent.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: HUMAN SUPPORT TICKETS & LEADS (MBI AI DRAWER HANDOVER) */}
      {/* ========================================================= */}
      {hubTab === 'tickets' && (
        <div className="space-y-4">
          {/* Top Filter and Search Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search lead, pharmacy, WhatsApp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setTicketFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  ticketFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All ({supportTickets.length})
              </button>
              <button
                onClick={() => setTicketFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  ticketFilter === 'pending'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                }`}
              >
                Pending ({supportTickets.filter(t => (t.status || 'pending') === 'pending').length})
              </button>
              <button
                onClick={() => setTicketFilter('contacted')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  ticketFilter === 'contacted'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
                }`}
              >
                Contacted ({supportTickets.filter(t => t.status === 'contacted').length})
              </button>
              <button
                onClick={() => setTicketFilter('resolved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  ticketFilter === 'resolved'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Resolved ({supportTickets.filter(t => t.status === 'resolved').length})
              </button>
              <button
                onClick={() => fetchSupportTickets()}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                title="Refresh Tickets"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tickets List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supportTickets
              .filter(ticket => {
                const status = (ticket.status || 'pending').toLowerCase();
                if (ticketFilter !== 'all' && status !== ticketFilter) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const name = (ticket.owner_name || ticket.name || ticket.businessName || '').toLowerCase();
                const store = (ticket.store_name || ticket.businessName || '').toLowerCase();
                const phone = (ticket.phone || '').toLowerCase();
                const notes = (ticket.notes || ticket.question || ticket.issue || '').toLowerCase();
                return name.includes(q) || store.includes(q) || phone.includes(q) || notes.includes(q);
              })
              .map((ticket, idx) => {
                const ticketId = ticket.id || `tkt_${idx}`;
                const store = ticket.store_name || ticket.businessName || 'Pharmacy Store';
                const owner = ticket.owner_name || ticket.name || 'Owner';
                const phone = ticket.phone || '';
                const email = ticket.email || ticket.userEmail || '';
                const issueText = ticket.notes || ticket.question || ticket.issue || 'Direct support requested from MBI AI Drawer';
                const status = ticket.status || 'pending';
                const submittedTime = ticket.submitted_at || ticket.createdAt || new Date().toISOString();
                const cleanPhone = phone.replace(/[^0-9]/g, '');

                return (
                  <div
                    key={ticketId}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between space-y-3 relative group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-emerald-500" />
                            <span>{store}</span>
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {owner} {email ? `• ${email}` : ''}
                          </p>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          status === 'pending'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300'
                            : status === 'contacted'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {status}
                        </span>
                      </div>

                      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5 text-[11px] text-slate-400 uppercase">Issue / Requirement:</p>
                        <p className="line-clamp-3">{issueText}</p>
                      </div>

                      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Submitted: {new Date(submittedTime).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 1-Click Call Back & WhatsApp Chat Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`tel:${phone}`}
                          className="py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Call Back</span>
                        </a>

                        <a
                          href={`https://wa.me/${cleanPhone}?text=Assalam-o-Alaikum!%20Main%20MBI%20Inventra%20Sargodha%20Master%20Support%20se%20rabta%20kar%20raha%20hoon%20regarding%20your%20support%20request%20for%20${encodeURIComponent(store)}.`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>

                      {/* Status Update Actions */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-400 font-semibold">Mark Status:</span>
                        <div className="flex items-center gap-1">
                          {status !== 'pending' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticketId, 'pending')}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                            >
                              Pending
                            </button>
                          )}
                          {status !== 'contacted' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticketId, 'contacted')}
                              className="px-2 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-200 cursor-pointer"
                            >
                              Contacted
                            </button>
                          )}
                          {status !== 'resolved' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticketId, 'resolved')}
                              className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 cursor-pointer"
                            >
                              Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {supportTickets.length === 0 && (
              <div className="col-span-full p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-500" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Support Tickets Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  When users request human support handover from the MBI AI Drawer, their tickets with WhatsApp numbers will appear here immediately.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: AI CLICKS & TELEMETRY ANALYTICS */}
      {/* ========================================================= */}
      {hubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Clicks Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Widget Opens</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {analytics?.eventTypeCounts?.widget_open || 0}
              </div>
              <div className="text-[11px] text-blue-500 mt-0.5">Floating Bot Clicks</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Prompt Chips</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {analytics?.eventTypeCounts?.prompt_chip_click || 0}
              </div>
              <div className="text-[11px] text-purple-500 mt-0.5">Quick FAQ Clicks</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Messages Sent</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {analytics?.eventTypeCounts?.message_sent || 0}
              </div>
              <div className="text-[11px] text-indigo-500 mt-0.5">User Typed Inquiries</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Human Support</div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {analytics?.eventTypeCounts?.human_escalate_click || 0}
              </div>
              <div className="text-[11px] text-rose-500 mt-0.5">Escalations Triggered</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Voice Invocations</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {analytics?.eventTypeCounts?.voice_input || 0}
              </div>
              <div className="text-[11px] text-amber-500 mt-0.5">Mic / Speech Clicks</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Upgrade Clicks</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {analytics?.eventTypeCounts?.plan_upgrade_click || 0}
              </div>
              <div className="text-[11px] text-emerald-500 mt-0.5">SaaS Conversions</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Top Stores Usage Breakdown (4 cols) */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span>Top Stores by AI Clicks</span>
              </h3>
              <div className="space-y-2.5">
                {analytics?.topStores && analytics.topStores.length > 0 ? (
                  analytics.topStores.map((store, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{store.name}</span>
                      </div>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        {store.count} clicks
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No store activity recorded yet.</p>
                )}
              </div>
            </div>

            {/* Real-time Clickstream Telemetry Log (8 cols) */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Real-Time User Clickstream Log</span>
                </h3>
                <span className="text-[11px] text-slate-400">Showing last 40 events</span>
              </div>

              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase text-[10px] font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Event Action</th>
                      <th className="py-2.5 px-3">User / Store</th>
                      <th className="py-2.5 px-3">Page Context</th>
                      <th className="py-2.5 px-3">Label / Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {analytics?.recentEvents && analytics.recentEvents.length > 0 ? (
                      analytics.recentEvents.map((evt) => (
                        <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              evt.eventType === 'human_escalate_click'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                                : evt.eventType === 'widget_open'
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                                : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400'
                            }`}>
                              {evt.eventType}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {evt.storeName || evt.userName || 'Visitor'}
                          </td>
                          <td className="py-2 px-3 text-slate-500">
                            <span className="capitalize">{evt.pageContext || 'User ERP'}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                            {evt.eventLabel}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No click events logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ENGINE & MULTI-KEY ROTATOR SETTINGS */}
      {/* ========================================================= */}
      {hubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Master Toggles (6 cols) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Power className="w-4 h-4 text-indigo-500" />
              <span>AI Engine Master Switches</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Global AI Assistant Switch</h4>
                <p className="text-[11px] text-slate-500">Enable or disable MBI AI Guide globally across all users and landing pages.</p>
              </div>
              <input
                type="checkbox"
                checked={isGlobalOn}
                onChange={(e) => setIsGlobalOn(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Home Page Assistant</h4>
                <p className="text-[11px] text-slate-500">Show floating AI bot on Landing Page / Home for prospective pharmacy leads.</p>
              </div>
              <input
                type="checkbox"
                checked={homeOn}
                onChange={(e) => setHomeOn(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Plan-Tier Gating Switches</h4>
              <p className="text-[11px] text-slate-500">Configure which subscription tiers get AI Assistant access in their dashboard.</p>
              
              <div className="grid grid-cols-3 gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={plans.basic}
                    onChange={(e) => setPlans({ ...plans, basic: e.target.checked })}
                    className="rounded text-indigo-600 cursor-pointer"
                  />
                  <span>Basic / Free</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={plans.business}
                    onChange={(e) => setPlans({ ...plans, business: e.target.checked })}
                    className="rounded text-indigo-600 cursor-pointer"
                  />
                  <span>Business</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={plans.enterprise}
                    onChange={(e) => setPlans({ ...plans, enterprise: e.target.checked })}
                    className="rounded text-indigo-600 cursor-pointer"
                  />
                  <span>Enterprise</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Human Support WhatsApp Number</label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Auto Welcome Greeting</label>
              <textarea
                value={customGreeting}
                onChange={(e) => setCustomGreeting(e.target.value)}
                rows={2}
                placeholder="Assalam-o-Alaikum! Main MBI AI Guide hoon..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save AI Settings'}
            </button>
          </div>

          {/* Multi-Key Pool Rotator & Health Table (6 cols) */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-500" />
                <span>Multi-Key Rotator &amp; Health Monitor</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                {aiConfig?.keyCount || 3} Active Keys in Pool
              </span>
            </div>

            <p className="text-xs text-slate-500">
              The AI Engine automatically load balances requests across this key pool and auto-fails over if any key hits 429 rate limits.
            </p>

            <div className="space-y-2">
              {aiConfig?.keyHealthMetrics?.map((metric, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {metric.maskedKey}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        metric.status === 'Healthy'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                          : metric.status === 'Rate-Limited'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                      }`}>
                        {metric.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                      <span>Requests: {metric.requestsCount}</span>
                      <span>Errors: {metric.errorCount}</span>
                      <span>Last Used: {metric.lastUsed}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTestKey(metric.key)}
                    disabled={testingKey === metric.key}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold transition shrink-0 cursor-pointer"
                  >
                    {testingKey === metric.key ? 'Pinging...' : 'Ping Test'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
