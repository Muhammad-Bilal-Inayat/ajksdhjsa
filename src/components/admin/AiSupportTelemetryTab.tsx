import React, { useState } from 'react';
import { 
  Bot, MessageSquare, PhoneCall, Sparkles, Search, CheckCircle2, 
  AlertTriangle, Clock, Building2, User, Send, ExternalLink, 
  TrendingUp, Zap, HelpCircle, ShieldCheck, RefreshCw, BarChart3,
  Calendar, ArrowUpRight, MessageCircle, Filter
} from 'lucide-react';
import { emitToast } from '../../contexts/ToastContext';

interface UrgentSupportLead {
  id: string;
  storeName: string;
  city: string;
  ownerName: string;
  phone: string;
  problemSummary: string;
  urgency: 'HIGH' | 'MEDIUM' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  timestamp: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  intent?: string;
}

interface StoreAiTranscript {
  tenantId: string;
  storeName: string;
  city: string;
  ownerName: string;
  totalQueries: number;
  lastActive: string;
  messages: ChatMessage[];
}

const INITIAL_SUPPORT_QUEUE: UrgentSupportLead[] = [];

const STORE_TRANSCRIPTS: StoreAiTranscript[] = [];

export const AiSupportTelemetryTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'transcripts' | 'analytics'>('queue');
  const [supportQueue, setSupportQueue] = useState<UrgentSupportLead[]>(INITIAL_SUPPORT_QUEUE);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeTranscript = STORE_TRANSCRIPTS.find(t => t.tenantId === selectedTenantId) || STORE_TRANSCRIPTS[0];

  const handleOpenWhatsApp = (phone: string, storeName: string, problem: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `92${cleanPhone.slice(1)}` : cleanPhone;
    const message = encodeURIComponent(
      `Assalam-o-Alaikum ${storeName} Team,\n\nThis is MBI Inventra Senior Engineering Support regarding your request:\n"${problem}"\n\nHow can we assist you right now?`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    emitToast(`💬 Opening WhatsApp Chat with ${storeName}`, 'info');
  };

  const handleToggleStatus = (id: string) => {
    setSupportQueue(prev => prev.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === 'OPEN' ? 'IN_PROGRESS' : item.status === 'IN_PROGRESS' ? 'RESOLVED' : 'OPEN';
        return { ...item, status: nextStatus };
      }
      return item;
    }));
    emitToast('Support ticket status updated', 'success');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-slate-900 dark:text-slate-100">
      
      {/* HEADER BAR & SUB-TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                MBI AI Telemetry &amp; Human Support Hub
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Live 24/7 Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live human intervention queue, AI copilot transcripts, and pharmacy generic search analytics
            </p>
          </div>
        </div>

        {/* Sub-Tabs Nav */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('queue')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'queue'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>1. Urgent Queue ({supportQueue.filter(q => q.status !== 'RESOLVED').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('transcripts')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'transcripts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>2. Store Chat Transcripts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('analytics')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>3. AI Analytics</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: URGENT HUMAN SUPPORT QUEUE */}
      {activeSubTab === 'queue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Unresolved Tickets
              </span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {supportQueue.filter(q => q.status === 'OPEN').length} Urgent
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Requires WhatsApp / Voice Call</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                In Progress
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {supportQueue.filter(q => q.status === 'IN_PROGRESS').length} Active
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Team currently assisting</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Avg Response Time
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                &lt; 3.2 Mins
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Direct WhatsApp SLA</p>
            </div>
          </div>

          {/* Queue Cards List */}
          <div className="space-y-3">
            {supportQueue.map(lead => (
              <div 
                key={lead.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{lead.storeName}</span>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      ({lead.city})
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      lead.urgency === 'CRITICAL' 
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        : lead.urgency === 'HIGH'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    }`}>
                      {lead.urgency}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{lead.timestamp}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    "{lead.problemSummary}"
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lead.ownerName}</span>
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                      {lead.phone}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(lead.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                      lead.status === 'RESOLVED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : lead.status === 'IN_PROGRESS'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Status: {lead.status}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(lead.phone, lead.storeName, lead.problemSummary)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer transition-all active:scale-98"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>💬 Open WhatsApp Chat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: USER-WISE AI CHAT HISTORY TRANSCRIPTS */}
      {activeSubTab === 'transcripts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Sidebar: Stores List */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Pharmacies AI Activity</span>
            </h3>

            <div className="space-y-1.5">
              {STORE_TRANSCRIPTS.map(store => {
                const isSelected = store.tenantId === activeTranscript.tenantId;

                return (
                  <button
                    key={store.tenantId}
                    type="button"
                    onClick={() => setSelectedTenantId(store.tenantId)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                        : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{store.storeName}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {store.city} • {store.ownerName}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {store.totalQueries} Qs
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Chat Transcript */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span>{activeTranscript.storeName}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">({activeTranscript.city})</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Owner: <strong>{activeTranscript.ownerName}</strong> • {activeTranscript.totalQueries} total queries logged
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                Last Active: {activeTranscript.lastActive}
              </span>
            </div>

            {/* Messages View */}
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto custom-scrollbar p-2">
              {activeTranscript.messages.map(msg => {
                const isUser = msg.sender === 'user';

                return (
                  <div 
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1 font-medium">
                      <span>{isUser ? activeTranscript.ownerName : 'MBI AI Copilot'}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                      {msg.intent && (
                        <span className="ml-1 px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono text-[9px] font-bold">
                          {msg.intent}
                        </span>
                      )}
                    </div>

                    <div className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-tl-none whitespace-pre-line shadow-xs'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 3: AI ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Most Searched Generic Salts */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Top Searched Generic Salts</span>
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { salt: 'Paracetamol / Acetaminophen', count: 1420, pct: '92%' },
                { salt: 'Co-Amoxiclav (Amox + Clav)', count: 980, pct: '74%' },
                { salt: 'Cefixime Trihydrate', count: 850, pct: '65%' },
                { salt: 'Omeprazole / Esomeprazole', count: 720, pct: '58%' },
                { salt: 'Montelukast Sodium', count: 540, pct: '42%' }
              ].map(item => (
                <div key={item.salt} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.salt}</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.count} searches</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Asked Questions */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Top Asked Copilot Questions</span>
            </h3>
            <div className="space-y-2 text-xs">
              {[
                'How to handle customer medicine return with batch deduction?',
                'Keyboard shortcut for quick split-payment POS checkout',
                'Setting up 80mm ESC/POS thermal barcode printer',
                'How to transfer stock between two branches / godowns'
              ].map((q, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {idx + 1}. {q}
                </div>
              ))}
            </div>
          </div>

          {/* Resolution & SLA KPIs */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>AI Copilot Performance</span>
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Self-Resolution Rate</div>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">96.4%</div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Queries resolved without human help</div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">Median Response Latency</div>
                <div className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">340 ms</div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400">Local Vector &amp; Memory Cache</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AiSupportTelemetryTab;
