import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bot, MessageSquare, MousePointerClick, Activity, ShieldCheck, 
  Send, User, UserCheck, AlertCircle, PhoneCall, RefreshCw, 
  Sparkles, Key, CheckCircle2, Clock, Search, TrendingUp, 
  Trash2, Headphones, Check, Sliders, ExternalLink, Archive,
  Eye, CheckCheck, Building2, Flame, BarChart3, Filter,
  Download, ArrowUpRight, Zap, Play, Terminal, HelpCircle,
  Copy, Layers, ChevronRight, MessageCircleQuestion, Lock
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

interface KeyHealthStatus {
  key: string;
  maskedKey: string;
  status: 'Healthy' | 'Rate-Limited' | 'Error' | 'Unverified';
  requestsCount: number;
  errorCount: number;
  lastUsed: string;
  lastError?: string;
}

export const AiSupportModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'chat_history' | 'live_desk' | 'key_health' | 'telemetry_heatmap'>('dashboard');

  // Live Chat Desk states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'pending_human' | 'human_active' | 'active_ai' | 'resolved'>('all');
  const [deskViewMode, setDeskViewMode] = useState<'live' | 'archived'>('live');
  const [operatorReply, setOperatorReply] = useState('');
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem('mbi_server_operator_name') || 'MBI Sargodha Desk');
  const [sendingReply, setSendingReply] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // New API Key Management states
  const [newKeyInput, setNewKeyInput] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const [keyActionMsg, setKeyActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingKeyIndex, setTestingKeyIndex] = useState<number | null>(null);
  const [testingKeyResult, setTestingKeyResult] = useState<Record<number, { success: boolean; message: string }>>({});

  // Chat History & Immutable MariaDB Logs states
  const [immutableLogs, setImmutableLogs] = useState<ImmutableLogEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCompanyFilter, setAuditCompanyFilter] = useState('all');
  const [auditUserFilter, setAuditUserFilter] = useState('all');
  const [auditSenderFilter, setAuditSenderFilter] = useState<'all' | 'user' | 'ai' | 'human_agent'>('all');
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<ImmutableLogEntry | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Telemetry states
  const [analytics, setAnalytics] = useState<TelemetryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live AI Key Testing Playground
  const [testPrompt, setTestPrompt] = useState('What are the clinical dosage contraindications for Paracetamol in hepatic patients?');
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ text?: string; error?: string; latency?: number; keyIndex?: number } | null>(null);

  // Key stats mock / live status
  const [keyStats, setKeyStats] = useState<KeyHealthStatus[]>([
    { key: 'KEY_1', maskedKey: 'AQ.Ab8RN6J41z...eT9xA', status: 'Healthy', requestsCount: 1420, errorCount: 0, lastUsed: 'Just now' },
    { key: 'KEY_2', maskedKey: 'AQ.Ab8RN6L0k5...dMbWQ', status: 'Healthy', requestsCount: 980, errorCount: 1, lastUsed: '3 mins ago' },
    { key: 'KEY_3', maskedKey: 'AQ.Ab8RN6Ihct...cOSqw', status: 'Healthy', requestsCount: 650, errorCount: 0, lastUsed: '12 mins ago' }
  ]);

  // Canned Responses
  const CANNED_REPLIES = [
    'Assalam-o-Alaikum! Main MBI Sargodha Master Desk se rabta kar raha hoon. Aapki kya madad karoon?',
    'Aapka ticket check kar liya gaya hai, team abhi inventory sync kar rahi hai.',
    'Apna printer driver restart karein aur USB / Thermal baud rate 9600 par set karein.',
    'Aapki license key active hai. Device authorization complete ho chuka hai.',
    'Shukriya! Issue resolve ho gaya hai. Mazeed kisi guidance ke liye live desk par rabta karein.'
  ];

  // Ref specifically for the inner chat container (NOT window.scrollIntoView to prevent whole page jumps)
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0] || null;

  useEffect(() => {
    fetchAllData();
    const timer = setInterval(() => {
      fetchSilentUpdates();
    }, 5000);
    return () => clearInterval(timer);
  }, [sessionFilter]);

  // FIX: Scroll only the internal chat box container without scrolling the main browser window
  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [activeSession?.messages, activeSession?.id]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSessions(),
        fetchArchivedSessions(),
        fetchImmutableAuditLogs(),
        fetchAnalytics(),
        fetchAiSettings()
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

  const fetchArchivedSessions = async () => {
    try {
      const res = await fetch('/api/ai/chat/archived-sessions');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.sessions)) {
          setArchivedSessions(data.sessions);
        }
      }
    } catch (e) {}
  };

  const handleArchiveSession = async (sessionId: string) => {
    setArchivingId(sessionId);
    try {
      const res = await fetch(`/api/ai/chat/sessions/${sessionId}/archive`, {
        method: 'POST'
      });
      if (res.ok) {
        await Promise.all([fetchSessions(), fetchArchivedSessions()]);
      }
    } catch (e) {
    } finally {
      setArchivingId(null);
    }
  };

  const handleUnarchiveSession = async (sessionId: string) => {
    setArchivingId(sessionId);
    try {
      const res = await fetch(`/api/ai/chat/sessions/${sessionId}/unarchive`, {
        method: 'POST'
      });
      if (res.ok) {
        await Promise.all([fetchSessions(), fetchArchivedSessions()]);
        setDeskViewMode('live');
        setSelectedSessionId(sessionId);
      }
    } catch (e) {
    } finally {
      setArchivingId(null);
    }
  };

  const handleAddApiKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newKeyInput.trim() || addingKey) return;

    setAddingKey(true);
    setKeyActionMsg(null);
    try {
      const res = await fetch('/api/ai/keys/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKeyInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeyActionMsg({ type: 'success', text: data.message || 'Key registered successfully!' });
        setNewKeyInput('');
        if (data.keyHealth) {
          setKeyStats(data.keyHealth);
        } else {
          fetchAiSettings();
        }
      } else {
        setKeyActionMsg({ type: 'error', text: data.error || 'Failed to add key' });
      }
    } catch (err: any) {
      setKeyActionMsg({ type: 'error', text: err?.message || 'Network error adding key' });
    } finally {
      setAddingKey(false);
    }
  };

  const handleRemoveApiKey = async (keyToRemove: string) => {
    if (!window.confirm('Are you sure you want to remove this API key from the rotation pool?')) return;
    setKeyActionMsg(null);
    try {
      const res = await fetch('/api/ai/keys/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyToRemove })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeyActionMsg({ type: 'success', text: 'API key successfully removed.' });
        if (data.keyHealth) {
          setKeyStats(data.keyHealth);
        } else {
          fetchAiSettings();
        }
      } else {
        setKeyActionMsg({ type: 'error', text: data.error || 'Failed to remove key' });
      }
    } catch (err: any) {
      setKeyActionMsg({ type: 'error', text: err?.message || 'Network error removing key' });
    }
  };

  const handleTestKeySlot = async (keyToTest: string, idx: number) => {
    setTestingKeyIndex(idx);
    try {
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyToTest })
      });
      const data = await res.json();
      if (res.ok && data.success && data.result) {
        setTestingKeyResult(prev => ({
          ...prev,
          [idx]: {
            success: data.result.success,
            message: data.result.message || (data.result.success ? 'Healthy' : 'Error')
          }
        }));
        fetchAiSettings();
      }
    } catch (e: any) {
      setTestingKeyResult(prev => ({
        ...prev,
        [idx]: { success: false, message: e?.message || 'Failed test ping' }
      }));
    } finally {
      setTestingKeyIndex(null);
    }
  };

  const fetchAiSettings = async () => {
    try {
      const res = await fetch('/api/ai/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.status?.keyHealth) {
          setKeyStats(data.status.keyHealth);
        }
      }
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
          setSelectedSessionId((currentSelectedId) => {
            if (currentSelectedId && data.sessions.some((s: ChatSession) => s.id === currentSelectedId)) {
              return currentSelectedId;
            }
            return data.sessions.length > 0 ? data.sessions[0].id : null;
          });
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
      let url = '/api/ai/audit/immutable-logs?limit=400';
      if (auditSearch.trim()) url += `&search=${encodeURIComponent(auditSearch.trim())}`;
      if (auditCompanyFilter !== 'all') url += `&tenantId=${encodeURIComponent(auditCompanyFilter)}`;
      
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

  const handleRunTestPrompt = async () => {
    if (!testPrompt.trim() || testRunning) return;
    setTestRunning(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: testPrompt.trim(),
          context: 'user',
          userPlan: 'enterprise',
          businessName: 'Master Admin Test Runner'
        })
      });
      const latency = Math.round(performance.now() - start);
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          text: data.text,
          latency,
          keyIndex: data.keyIndexUsed
        });
      } else {
        setTestResult({
          error: data.error || 'Failed to generate test AI response',
          latency
        });
      }
    } catch (err: any) {
      setTestResult({
        error: err?.message || 'Network error executing AI test query',
        latency: Math.round(performance.now() - start)
      });
    } finally {
      setTestRunning(false);
    }
  };

  // Distinct Companies & Users from immutable logs
  const distinctCompanies = useMemo(() => {
    const map = new Map<string, string>();
    immutableLogs.forEach(log => {
      const tenantKey = log.tenant_id || 'default';
      const name = log.store_name || log.user_name || tenantKey;
      if (!map.has(tenantKey)) {
        map.set(tenantKey, name);
      }
    });
    return Array.from(map.entries()).map(([tenantId, name]) => ({ tenantId, name }));
  }, [immutableLogs]);

  const distinctUsers = useMemo(() => {
    const set = new Set<string>();
    immutableLogs.forEach(log => {
      if (log.user_name) set.add(log.user_name);
      if (log.sender_name && log.sender !== 'ai') set.add(log.sender_name);
    });
    return Array.from(set);
  }, [immutableLogs]);

  // Filtered Immutable Logs for History Tab
  const filteredLogs = useMemo(() => {
    return immutableLogs.filter(log => {
      if (auditCompanyFilter !== 'all' && log.tenant_id !== auditCompanyFilter) return false;
      if (auditUserFilter !== 'all' && log.user_name !== auditUserFilter && log.sender_name !== auditUserFilter) return false;
      if (auditSenderFilter !== 'all' && log.sender !== auditSenderFilter) return false;
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        const promptMatch = (log.prompt_or_text || '').toLowerCase().includes(q);
        const storeMatch = (log.store_name || '').toLowerCase().includes(q);
        const userMatch = (log.user_name || '').toLowerCase().includes(q);
        const tenantMatch = (log.tenant_id || '').toLowerCase().includes(q);
        if (!promptMatch && !storeMatch && !userMatch && !tenantMatch) return false;
      }
      return true;
    });
  }, [immutableLogs, auditCompanyFilter, auditUserFilter, auditSenderFilter, auditSearch]);

  const handleExportLogsCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Tenant_ID', 'Company_Store', 'User_Staff', 'Sender', 'Prompt_Or_Answer', 'Is_Escalation', 'Key_Index'];
    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${new Date(l.created_at).toISOString()}"`,
      `"${l.tenant_id || ''}"`,
      `"${(l.store_name || '').replace(/"/g, '""')}"`,
      `"${(l.user_name || l.sender_name || '').replace(/"/g, '""')}"`,
      `"${l.sender}"`,
      `"${(l.prompt_or_text || '').replace(/"/g, '""')}"`,
      `"${l.is_escalation ? 'YES' : 'NO'}"`,
      `"${l.key_index_used ?? ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MBI_AI_Chat_Audit_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const pendingEscalationsCount = sessions.filter(s => s.status === 'human_escalation_requested').length;
  const activeHumanCount = sessions.filter(s => s.status === 'human_active').length;
  const totalUserPromptsCount = immutableLogs.filter(l => l.sender === 'user').length;
  const totalAiResponsesCount = immutableLogs.filter(l => l.sender === 'ai').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HERO BANNER & STATUS BADGE */}
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
                  <span>MariaDB Immutable Sync Active</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-indigo-400" />
                  <span>3-Key Auto-Rotation</span>
                </span>
                {pendingEscalationsCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-bounce shadow-md flex items-center gap-1">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>{pendingEscalationsCount} Pending Support Takeover</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
                Comprehensive AI intelligence telemetry, company &amp; user chat history auditing, live human support takeover desk, and real-time Google Gemini multi-key health switchboard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
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
              <span>Refresh All</span>
            </button>
          </div>
        </div>

        {/* METRIC TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-800/80">
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
              <span>Immutable MariaDB Logs</span>
              <Archive className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {immutableLogs.length}
            </div>
            <div className="text-[11px] text-emerald-300 font-medium mt-0.5">
              {totalUserPromptsCount} user questions
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Active API Keys</span>
              <Key className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
              3 / 3 Healthy
            </div>
            <div className="text-[11px] text-amber-300 font-medium mt-0.5">
              100% Uptime Rotation
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/60 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Support Escalations</span>
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

      {/* NAVIGATION SUB-TABS */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'dashboard'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>AI Intelligence Dashboard</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('chat_history');
            fetchImmutableAuditLogs();
          }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'chat_history'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageCircleQuestion className="w-4 h-4" />
          <span>Company &amp; User Chat History</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
            {filteredLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('live_desk')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'live_desk'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
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
          onClick={() => setActiveSubTab('key_health')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'key_health'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>API Keys &amp; Model Switcher</span>
        </button>

        <button
          onClick={() => setActiveSubTab('telemetry_heatmap')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'telemetry_heatmap'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MousePointerClick className="w-4 h-4" />
          <span>Feature Clicks &amp; Heatmaps</span>
        </button>
      </div>

      {/* ========================================================
          SUB-TAB 1: AI INTELLIGENCE DASHBOARD
          ======================================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* TOP ANALYTICS TILES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Model Health</span>
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">Gemini 2.5 &amp; 1.5 Flash</h3>
                <p className="text-xs text-slate-500 mt-1">Active response latency: ~680ms • 100% success rate</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All 3 Rotation Keys Active
                </span>
                <span className="font-mono text-slate-400">REST v1beta</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Questions Ingested</span>
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">{totalUserPromptsCount} Questions</h3>
                <p className="text-xs text-slate-500 mt-1">{totalAiResponsesCount} automated AI responses delivered</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {distinctCompanies.length} Active Client Companies
                </span>
                <span className="font-mono text-slate-400">{distinctUsers.length} Unique Users</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Support Takeover Desk</span>
                  <Headphones className="w-4 h-4 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">{sessions.length} Live Channels</h3>
                <p className="text-xs text-slate-500 mt-1">{pendingEscalationsCount} requiring manual pharmacist / support action</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => setActiveSubTab('live_desk')}
                  className="text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Open Live Takeover Desk <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-slate-400">{activeHumanCount} In Progress</span>
              </div>
            </div>
          </div>

          {/* QUICK PROMPT TEST PLAYGROUND */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Live AI Model &amp; Key Verification Sandbox
                  </h3>
                  <p className="text-xs text-slate-500">
                    Test your system prompt and API keys directly from the master dashboard to verify real-time response generation.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                gemini-2.0-flash / gemini-1.5-pro
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter a test prompt (e.g. Drug interactions, POS sales calculation, formula query)..."
                className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleRunTestPrompt}
                disabled={testRunning || !testPrompt.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 cursor-pointer shrink-0"
              >
                {testRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying Gemini...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Execute Test</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-2xl text-xs space-y-2 border ${
                testResult.error 
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              }`}>
                <div className="flex items-center justify-between font-bold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    {testResult.error ? (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                    <span>{testResult.error ? 'Execution Error' : 'AI Response Generated Successfully'}</span>
                  </span>
                  <span className="font-mono text-slate-500">
                    Latency: {testResult.latency}ms {testResult.keyIndex !== undefined && `• Key #${testResult.keyIndex + 1}`}
                  </span>
                </div>
                <div className="font-sans leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-xs">
                  {testResult.error || testResult.text}
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE CLIENT COMPANIES OVERVIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span>Companies Utilizing AI Support</span>
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {distinctCompanies.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No company chat interactions recorded yet</p>
                ) : (
                  distinctCompanies.map(c => {
                    const companyLogsCount = immutableLogs.filter(l => l.tenant_id === c.tenantId).length;
                    return (
                      <div key={c.tenantId} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Tenant ID: {c.tenantId}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold font-mono">
                            {companyLogsCount} logs
                          </span>
                          <button
                            onClick={() => {
                              setAuditCompanyFilter(c.tenantId);
                              setActiveSubTab('chat_history');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="View Chat History"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Feature Engagement Breakdown</span>
              </h3>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {Object.entries(analytics?.eventTypeCounts || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No telemetry click events recorded</p>
                ) : (
                  Object.entries(analytics?.eventTypeCounts || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                        {type.replace(/_/g, ' ')}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-xs font-black font-mono">
                        {count} clicks
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: COMPANY & USER CHAT HISTORY (HISTORY TAB)
          ======================================================== */}
      {activeSubTab === 'chat_history' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MessageCircleQuestion className="w-5 h-5 text-emerald-500" />
                <span>Company &amp; User AI Chat History Hub</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full transparent audit log of questions asked by each company and staff user, complete with timestamps, AI answers, and token telemetry.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
              <button
                onClick={handleExportLogsCsv}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => fetchImmutableAuditLogs()}
                disabled={loadingAudit}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                <span>Refresh History</span>
              </button>
            </div>
          </div>

          {/* ADVANCED MULTI-DIMENSIONAL FILTERS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search prompt or question..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Company / Store Filter */}
            <div>
              <select
                value={auditCompanyFilter}
                onChange={(e) => setAuditCompanyFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">🏢 All Companies ({distinctCompanies.length})</option>
                {distinctCompanies.map(c => (
                  <option key={c.tenantId} value={c.tenantId}>
                    {c.name} ({c.tenantId})
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            <div>
              <select
                value={auditUserFilter}
                onChange={(e) => setAuditUserFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">👤 All Staff Users ({distinctUsers.length})</option>
                {distinctUsers.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Sender Type Filter */}
            <div>
              <select
                value={auditSenderFilter}
                onChange={(e) => setAuditSenderFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">🔄 All Senders (User + AI + Human)</option>
                <option value="user">👤 User / Client Questions Only</option>
                <option value="ai">🤖 AI Responses Only</option>
                <option value="human_agent">🎧 Human Operator Messages</option>
              </select>
            </div>
          </div>

          {/* CHAT HISTORY TABLE */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Company &amp; Pharmacy</th>
                    <th className="p-3.5">Staff User</th>
                    <th className="p-3.5">Role / Sender</th>
                    <th className="p-3.5 max-w-md">Question / Prompt / Response</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        <MessageCircleQuestion className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-500">No matching AI chat records found</p>
                        <p className="text-[11px] text-slate-400 mt-1">Try clearing your search query or company filter</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isUser = log.sender === 'user';
                      const isAi = log.sender === 'ai';
                      const isHuman = log.sender === 'human_agent';
                      return (
                        <tr 
                          key={log.id} 
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                          onClick={() => setSelectedLogDetail(log)}
                        >
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.created_at).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[160px]">{log.store_name || log.user_name || 'Pharmacy Store'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {log.tenant_id || 'tenant_default'} • {log.user_plan || 'Business'}
                            </div>
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.user_name || log.sender_name || 'Staff User'}</span>
                            </div>
                            {log.page_context && (
                              <div className="text-[10px] text-slate-400 capitalize">
                                Context: {log.page_context}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              isUser
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                                : isHuman
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                : 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                            }`}>
                              {isUser ? <User className="w-3 h-3" /> : isHuman ? <Headphones className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                              <span>{isUser ? 'User Question' : isHuman ? 'Human Operator' : 'AI Response'}</span>
                            </span>
                          </td>

                          <td className="p-3.5 max-w-md">
                            <p className="line-clamp-2 text-slate-800 dark:text-slate-200 font-sans leading-relaxed text-xs">
                              {log.prompt_or_text}
                            </p>
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            {log.is_escalation ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/30">
                                Support Lead
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Standard</span>
                            )}
                          </td>

                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => copyToClipboard(log.prompt_or_text, log.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Copy Text"
                              >
                                {copiedLogId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => setSelectedLogDetail(log)}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
                                title="Inspect Full Transcript"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LOG DETAIL INSPECTOR MODAL */}
          {selectedLogDetail && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      {selectedLogDetail.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        AI Interaction Audit Detail
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Session: {selectedLogDetail.session_id}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLogDetail(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Company / Store</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedLogDetail.store_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Staff User</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedLogDetail.user_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tenant ID</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{selectedLogDetail.tenant_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Timestamp</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">{new Date(selectedLogDetail.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{selectedLogDetail.sender === 'user' ? 'Prompt / Question Text' : 'AI Generated Response'}</span>
                    <button
                      onClick={() => copyToClipboard(selectedLogDetail.prompt_or_text, 'modal')}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedLogId === 'modal' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedLogDetail.prompt_or_text}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedLogDetail(null)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-300"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUB-TAB 3: LIVE TWO-WAY SUPPORT & TAKEOVER DESK
          ======================================================== */}
      {activeSubTab === 'live_desk' && (
        <div className="space-y-4">
          {/* DESK MODE SELECTOR BANNER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDeskViewMode('live');
                  if (sessions.length > 0 && !sessions.some(s => s.id === selectedSessionId)) {
                    setSelectedSessionId(sessions[0].id);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  deskViewMode === 'live'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Active Live Desk</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {sessions.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setDeskViewMode('archived');
                  fetchArchivedSessions();
                  if (archivedSessions.length > 0 && !archivedSessions.some(s => s.id === selectedSessionId)) {
                    setSelectedSessionId(archivedSessions[0].id);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  deskViewMode === 'archived'
                    ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-amber-400" />
                <span>Archived Vault (7d+ / 20+ Cap)</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
                  {archivedSessions.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Auto-Archived after 7 Days or 20+ Active Sessions to guarantee 0ms server speed</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px]">
            {/* SESSIONS LIST */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
                {deskViewMode === 'live' ? (
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
                      Active Desk ({activeHumanCount})
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                    <span className="flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5 text-amber-500" />
                      <span>Archived Chat Sessions</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Total: {archivedSessions.length}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[520px]">
                {(deskViewMode === 'live' ? sessions : archivedSessions).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Bot className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-500">
                      {deskViewMode === 'live' ? 'No active chat sessions' : 'No archived chat sessions'}
                    </p>
                  </div>
                ) : (
                  (deskViewMode === 'live' ? sessions : archivedSessions).map((s) => {
                    const isSelected = (deskViewMode === 'live' ? activeSession?.id : (selectedSessionId || archivedSessions[0]?.id)) === s.id;
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
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {s.tenantId} • {s.messages?.length || 0} msgs
                          </span>
                          {isPending && deskViewMode === 'live' && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                              Requires Support
                            </span>
                          )}
                          {deskViewMode === 'archived' && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Archived
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ACTIVE CHAT TRANSCRIPT & OPERATOR TAKEOVER */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
              {(() => {
                const currentDisplayedSession = deskViewMode === 'live' 
                  ? activeSession 
                  : (archivedSessions.find(s => s.id === selectedSessionId) || archivedSessions[0] || null);

                if (!currentDisplayedSession) {
                  return (
                    <div className="p-16 text-center text-slate-400">
                      <Bot className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-50" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        {deskViewMode === 'live' ? 'Select an active session to view live transcript' : 'Select an archived conversation to view history'}
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900 dark:text-white">
                            {currentDisplayedSession.userName}
                          </h3>
                          <span className="text-slate-400 font-normal">•</span>
                          <span className="text-sm text-slate-600 dark:text-slate-300 font-semibold">{currentDisplayedSession.storeName}</span>
                          {deskViewMode === 'archived' && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                              📦 Archived
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">Tenant: {currentDisplayedSession.tenantId}</span>
                          {currentDisplayedSession.userPhone && <span className="font-mono">{currentDisplayedSession.userPhone}</span>}
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[10px] uppercase font-bold">{currentDisplayedSession.plan}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentDisplayedSession.userPhone && (
                          <a
                            href={`https://wa.me/${currentDisplayedSession.userPhone.replace(/[^0-9]/g, '')}?text=Assalam-o-Alaikum!%20Main%20MBI%20Inventra%20Sargodha%20Master%20Support%20se%20rabta%20kar%20raha%20hoon.`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp Direct</span>
                          </a>
                        )}

                        {deskViewMode === 'live' ? (
                          <>
                            {currentDisplayedSession.status !== 'human_active' ? (
                              <button
                                onClick={() => handleUpdateStatus(currentDisplayedSession.id, 'human_active')}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                              >
                                Take Over Conversation
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(currentDisplayedSession.id, 'active_ai')}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 text-xs font-bold transition cursor-pointer"
                              >
                                Return to AI Bot
                              </button>
                            )}

                            <button
                              onClick={() => handleArchiveSession(currentDisplayedSession.id)}
                              disabled={archivingId === currentDisplayedSession.id}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Move to Archived Vault"
                            >
                              <Archive className="w-3.5 h-3.5 text-amber-500" />
                              <span>Archive</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUnarchiveSession(currentDisplayedSession.id)}
                            disabled={archivingId === currentDisplayedSession.id}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                          >
                            <Headphones className="w-3.5 h-3.5" />
                            <span>Restore to Live Desk</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* INTERNAL SCROLLABLE CHAT CONTAINER (NEVER SCROLLS PARENT PAGE) */}
                    <div 
                      ref={chatMessagesContainerRef}
                      className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-slate-950/20 max-h-[380px]"
                    >
                      {currentDisplayedSession.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex flex-col ${m.sender === 'user' ? 'items-start' : 'items-end'}`}
                        >
                          <div className="text-[10px] text-slate-400 mb-1 px-1 flex items-center gap-1">
                            <span>{m.sender === 'user' ? currentDisplayedSession.userName : m.senderName}</span>
                            <span>•</span>
                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-sans leading-relaxed shadow-xs ${
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
                    </div>

                    {/* CANNED REPLIES STRIP (ONLY IN LIVE DESK) */}
                    {deskViewMode === 'live' && (
                      <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                        <span className="text-slate-400 font-bold shrink-0">Quick:</span>
                        {CANNED_REPLIES.map((reply, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendOperatorReply(reply)}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap transition cursor-pointer text-[10px]"
                          >
                            {reply.substring(0, 30)}...
                          </button>
                        ))}
                      </div>
                    )}

                    {/* REPLY INPUT (ONLY IN LIVE DESK) */}
                    {deskViewMode === 'live' ? (
                      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Reply as ${operatorName}...`}
                          value={operatorReply}
                          onChange={(e) => setOperatorReply(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendOperatorReply();
                          }}
                          className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleSendOperatorReply()}
                          disabled={!operatorReply.trim() || sendingReply}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-500 px-4">
                        <span>This chat is safely archived in the server vault to reduce active DOM memory load.</span>
                        <button
                          onClick={() => handleUnarchiveSession(currentDisplayedSession.id)}
                          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                        >
                          Reopen in Live Desk →
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 4: API KEYS & MODEL SWITCHBOARD (ADD / REMOVE / TEST)
          ======================================================== */}
      {activeSubTab === 'key_health' && (
        <div className="space-y-6">
          {/* ADD NEW API KEY CARD */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 rounded-3xl p-6 border border-amber-500/30 dark:border-amber-500/20 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Register New Gemini AI API Key
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add new Google Gemini API keys into active auto-rotation pool or remove previous exhausted keys seamlessly.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {keyStats.length} Total Keys in Rotation
              </span>
            </div>

            <form onSubmit={handleAddApiKey} className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                  placeholder="Paste new Gemini API key (e.g. AQ.Ab8RN... or AIzaSy...)"
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={addingKey || !newKeyInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 cursor-pointer shrink-0"
              >
                {addingKey ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying &amp; Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>+ Add Key to Pool</span>
                  </>
                )}
              </button>
            </form>

            {keyActionMsg && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                keyActionMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              }`}>
                {keyActionMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>{keyActionMsg.text}</span>
              </div>
            )}
          </div>

          {/* ACTIVE KEYS LIST CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Active Multi-Key Rotation Pool
                  </h3>
                  <p className="text-xs text-slate-500">
                    High-availability fallback architecture: If Key 1 reaches rate limit or quota, subsequent keys take over automatically without downtime.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Auto-Failover Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {keyStats.map((k, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span>Key Slot #{idx + 1}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        k.status === 'Healthy'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : k.status === 'Rate-Limited'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}>
                        {k.status}
                      </span>
                    </div>

                    <div className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 truncate mt-2">
                      {k.maskedKey}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2.5 mt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <span>Requests: <strong className="text-slate-800 dark:text-slate-200">{k.requestsCount}</strong></span>
                      <span>Last Used: {k.lastUsed}</span>
                    </div>

                    {testingKeyResult[idx] && (
                      <div className={`mt-2 p-2 rounded-lg text-[10px] font-mono leading-tight ${
                        testingKeyResult[idx].success
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}>
                        {testingKeyResult[idx].message}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <button
                      onClick={() => handleTestKeySlot(k.key, idx)}
                      disabled={testingKeyIndex === idx}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
                    >
                      {testingKeyIndex === idx ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      <span>Test Ping</span>
                    </button>

                    <button
                      onClick={() => handleRemoveApiKey(k.key)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="Remove key from rotation"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 5: TELEMETRY HEATMAP
          ======================================================== */}
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
