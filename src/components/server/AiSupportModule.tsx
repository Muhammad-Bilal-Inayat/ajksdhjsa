import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, MessageSquare, MousePointerClick, Activity, ShieldCheck, 
  Send, User, UserCheck, AlertCircle, PhoneCall, RefreshCw, 
  Sparkles, Key, CheckCircle2, Clock, Search, TrendingUp, 
  Trash2, Headphones, Check, Sliders, ExternalLink, Archive,
  Eye, CheckCheck, Building2, Flame
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'human_agent';
  senderName: string;
  text: string;
  timestamp: string;
  isEscalation?: boolean;
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

interface ImmutableLogEntry {
  id: string;
  session_id: string;
  tenant_id: string;
  user_id?: string;
  user_name?: string;
  store_name?: string;
  user_plan?: string;
  sender: 'user' | 'ai' | 'human_agent';
  sender_name?: string;
  prompt_or_text: string;
  is_escalation: number;
  key_index_used: number;
  ip_address?: string;
  page_context?: string;
  created_at: string;
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
  recentEvents: any[];
}

export const AiSupportModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'live_desk' | 'immutable_audit' | 'telemetry_heatmap' | 'key_health'>('live_desk');

  // Live Chat Desk states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'pending_human' | 'human_active' | 'active_ai' | 'resolved'>('all');
  const [operatorReply, setOperatorReply] = useState('');
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem('mbi_server_operator_name') || 'MBI Sargodha Desk');
  const [sendingReply, setSendingReply] = useState(false);

  // Immutable MariaDB Logs states
  const [immutableLogs, setImmutableLogs] = useState<ImmutableLogEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTenantFilter, setAuditTenantFilter] = useState('all');
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Telemetry states
  const [analytics, setAnalytics] = useState<TelemetryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0] || null;

  useEffect(() => {
    fetchAllData();
    const timer = setInterval(() => {
      fetchSilentUpdates();
    }, 4000);
    return () => clearInterval(timer);
  }, [sessionFilter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, activeSession?.id]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSessions(),
        fetchImmutableAuditLogs(),
        fetchAnalytics()
      ]);
    } catch (e) {
      console.warn('Error loading AI Support module data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSilentUpdates = async () => {
    try {
      await Promise.all([
        fetchSessions(true),
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
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  const fetchImmutableAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      let url = '/api/ai/audit/immutable-logs?limit=300';
      if (auditSearch.trim()) url += `&search=${encodeURIComponent(auditSearch.trim())}`;
      if (auditTenantFilter !== 'all') url += `&tenantId=${encodeURIComponent(auditTenantFilter)}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          setImmutableLogs(data.logs);
        }
      }
    } catch (e) {
    } finally {
      setLoadingAudit(false);
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

  const handleSendOperatorReply = async (cannedText?: string) => {
    const textToSend = cannedText || operatorReply;
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
          setOperatorReply('');
          setSessions(prev => prev.map(s => s.id === activeSession.id ? data.session : s));
          fetchImmutableAuditLogs();
        }
      }
    } catch (e) {
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
        }
      }
    } catch (e) {}
  };

  const pendingEscalationsCount = sessions.filter(s => s.status === 'human_escalation_requested').length;
  const activeHumanCount = sessions.filter(s => s.status === 'human_active').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

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
                  MBI AI Telemetry &amp; Support Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>MariaDB Immutable Sync</span>
                </span>
                {pendingEscalationsCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-bounce shadow-md flex items-center gap-1">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>{pendingEscalationsCount} Pending Support Takeover</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Permanent MariaDB chat audit transcripts (<code className="font-mono text-indigo-300">mbi_ai_chat_history</code>), live human support takeover desk, and user click telemetry heatmaps.
              </p>
            </div>
          </div>

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
              onClick={() => fetchAllData()}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* METRIC TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Clicks Tracked</span>
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
              <span>Active Chat Sessions</span>
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
              <span>Immutable Logs Stored</span>
              <Archive className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {immutableLogs.length}
            </div>
            <div className="text-[11px] text-emerald-300 font-medium mt-0.5">
              MariaDB mbi_ai_chat_history
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Pending Human Takeover</span>
              <Headphones className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
              {pendingEscalationsCount}
            </div>
            <div className="text-[11px] text-rose-300 font-medium mt-0.5">
              1-Click Takeover Ready
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('live_desk')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'live_desk'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>Live Support &amp; Takeover Desk</span>
          {pendingEscalationsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {pendingEscalationsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveSubTab('immutable_audit');
            fetchImmutableAuditLogs();
          }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'immutable_audit'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Immutable MariaDB Chat Logs</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
            {immutableLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('telemetry_heatmap')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'telemetry_heatmap'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MousePointerClick className="w-4 h-4" />
          <span>User Feature Clicks &amp; Heatmaps</span>
        </button>
      </div>

      {/* SUB-TAB 1: LIVE DESK */}
      {activeSubTab === 'live_desk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px]">
          {/* SESSIONS LIST */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
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
                  Need Support ({pendingEscalationsCount})
                </button>
                <button
                  onClick={() => setSessionFilter('human_active')}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition ${
                    sessionFilter === 'human_active'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                  }`}
                >
                  Active ({activeHumanCount})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[520px]">
              {sessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <Bot className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-slate-500">No active chat sessions</p>
                </div>
              ) : (
                sessions.map((s) => {
                  const isSelected = activeSession?.id === s.id;
                  const isPending = s.status === 'human_escalation_requested';
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSessionId(s.id)}
                      className={`p-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {s.userName || 'Pharmacy Client'}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {s.storeName || 'Pharmacy Store'}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(s.lastMessageAt || s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-1 font-sans">
                        {s.lastMessage || 'Conversation active'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ACTIVE CHAT TRANSCRIPT & OPERATOR TAKEOVER */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
            {activeSession ? (
              <>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {activeSession.userName} • {activeSession.storeName}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      {activeSession.userPhone && <span className="font-mono">{activeSession.userPhone}</span>}
                      <span>Plan: {activeSession.plan}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeSession.userPhone && (
                      <a
                        href={`https://wa.me/${activeSession.userPhone.replace(/[^0-9]/g, '')}?text=Assalam-o-Alaikum!%20Main%20MBI%20Inventra%20Sargodha%20Master%20Support%20se%20rabta%20kar%20raha%20hoon.`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp Direct</span>
                      </a>
                    )}
                    {activeSession.status !== 'human_active' ? (
                      <button
                        onClick={() => handleUpdateStatus(activeSession.id, 'human_active')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                      >
                        Take Over
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(activeSession.id, 'active_ai')}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                      >
                        Return to Bot
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-slate-950/20 max-h-[380px]">
                  {activeSession.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-start' : 'items-end'}`}
                    >
                      <div className="text-[10px] text-slate-400 mb-1 px-1">
                        {m.sender === 'user' ? activeSession.userName : m.senderName} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-sans ${
                        m.sender === 'user'
                          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                          : m.sender === 'human_agent'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Reply as ${operatorName}...`}
                    value={operatorReply}
                    onChange={(e) => setOperatorReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendOperatorReply();
                    }}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    onClick={() => handleSendOperatorReply()}
                    disabled={!operatorReply.trim() || sendingReply}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    Send Reply
                  </button>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <p>Select a chat session to view live transcript</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: IMMUTABLE MARIADB AUDIT LOGS */}
      {activeSubTab === 'immutable_audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-emerald-500" />
                <span>Immutable MariaDB AI Chat Archive (`mbi_ai_chat_history`)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Permanent records stored in MariaDB. Even if clients clear their local browser history, full transcripts remain archived here.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search prompts, stores, users..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchImmutableAuditLogs();
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <button
                onClick={fetchImmutableAuditLogs}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Search
              </button>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th className="p-3">Time &amp; Session</th>
                  <th className="p-3">Store &amp; User</th>
                  <th className="p-3">Sender</th>
                  <th className="p-3">Prompt / Message Text</th>
                  <th className="p-3 text-right">Escalation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {immutableLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No immutable chat logs recorded yet in MariaDB
                    </td>
                  </tr>
                ) : (
                  immutableLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-mono text-[11px] text-slate-900 dark:text-white">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                          {log.session_id}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.store_name || log.user_name || 'Anonymous Store'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {log.tenant_id} • {log.user_plan || 'Business'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.sender === 'user'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : log.sender === 'human_agent'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                        }`}>
                          {log.sender_name || log.sender}
                        </span>
                      </td>
                      <td className="p-3 max-w-md">
                        <p className="line-clamp-2 text-slate-800 dark:text-slate-200">
                          {log.prompt_or_text}
                        </p>
                      </td>
                      <td className="p-3 text-right">
                        {log.is_escalation ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/30">
                            Support Requested
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Standard</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TELEMETRY HEATMAP */}
      {activeSubTab === 'telemetry_heatmap' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Feature Click Event Breakdown</span>
            </h3>
            <div className="space-y-2.5">
              {Object.entries(analytics?.eventTypeCounts || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black">
                    {count} clicks
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>Top Active Pharmacy Stores (Telemetry)</span>
            </h3>
            <div className="space-y-2.5">
              {(analytics?.topStores || []).map((store, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {store.name}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                    {store.count} actions
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
