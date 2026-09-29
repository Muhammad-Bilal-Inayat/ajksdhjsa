import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  X, Send, Sparkles, Trash2, Bot, User, 
  MessageSquare, Copy, Check,
  Headphones, PhoneCall, RefreshCw, Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  isSupportForm?: boolean;
  isSupportConfirmed?: boolean;
}

interface MbiAiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sleek markdown parser for formatted chat bubbles
const renderFormattedText = (content: string) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 leading-relaxed text-xs">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1" />;
        }

        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ');
        const cleanLine = isBullet ? line.trim().replace(/^[-*•]\s+/, '') : line;

        const parseInline = (text: string) => {
          const parts: React.ReactNode[] = [];
          const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
          let lastIndex = 0;
          let match;

          while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
              parts.push(text.substring(lastIndex, match.index));
            }
            const matchText = match[0];
            if (matchText.startsWith('**') && matchText.endsWith('**')) {
              parts.push(
                <strong key={`${lineIdx}-${match.index}`} className="font-bold text-inherit">
                  {matchText.slice(2, -2)}
                </strong>
              );
            } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
              parts.push(
                <em key={`${lineIdx}-${match.index}`} className="italic text-inherit">
                  {matchText.slice(1, -1)}
                </em>
              );
            } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
              parts.push(
                <code key={`${lineIdx}-${match.index}`} className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 font-mono text-[11px] text-blue-600 dark:text-blue-300">
                  {matchText.slice(1, -1)}
                </code>
              );
            }
            lastIndex = match.index + matchText.length;
          }

          if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
          }

          return parts.length > 0 ? parts : text;
        };

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-1">
              <span className="text-blue-500 dark:text-blue-400 font-bold shrink-0 select-none">•</span>
              <span className="flex-1">{parseInline(cleanLine)}</span>
            </div>
          );
        }

        const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 pl-1">
              <span className="font-bold text-blue-500 dark:text-blue-400 shrink-0 select-none">{numMatch[1]}.</span>
              <span className="flex-1">{parseInline(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={lineIdx}>{parseInline(line)}</p>;
      })}
    </div>
  );
};

export const MbiAiChatDrawer: React.FC<MbiAiChatDrawerProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { tenant, business, currentUser } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isServerRoute = location.pathname.startsWith('/server') || location.pathname.startsWith('/master');
  const pharmacyName = business?.name || tenant?.name || 'My Pharmacy';
  const userFullName = currentUser?.name || (currentUser as any)?.displayName || 'Pharmacy Owner';
  const userEmailAddress = currentUser?.email || (currentUser as any)?.email_or_phone || '';
  const userPhoneAddress = (currentUser as any)?.phone || business?.mobile || business?.phone || '';

  // Initial welcome message based on context
  const getInitialMessage = (): ChatMessage => ({
    id: 'welcome-msg',
    sender: 'ai',
    text: isServerRoute
      ? `🛡️ **MBI Master Fleet Copilot Active**\nI can assist you with multi-tenant telemetry, HWID device license resets, automated disaster recovery backups, and cloud switchboard management. How can I help?`
      : `✨ **Assalam-o-Alaikum! I am MBI AI, your Pharmacy POS & ERP Copilot.**\nI can find generic medicine alternatives, explain FEFO expiry rules, guide POS billing shortcuts (F1/F2), or connect you with Master Admin Human Support. How can I help?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(`mbi_ai_chat_${isServerRoute ? 'server' : 'user'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [getInitialMessage()];
  });

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Human Support Form States
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportName, setSupportName] = useState(userFullName);
  const [supportPhone, setSupportPhone] = useState(userPhoneAddress);
  const [supportIssue, setSupportIssue] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, showSupportForm, isOpen]);

  // Persist messages in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`mbi_ai_chat_${isServerRoute ? 'server' : 'user'}`, JSON.stringify(messages.slice(-30)));
    } catch (e) {}
  }, [messages, isServerRoute]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    const welcome = getInitialMessage();
    setMessages([welcome]);
    setShowSupportForm(false);
    localStorage.removeItem(`mbi_ai_chat_${isServerRoute ? 'server' : 'user'}`);
  };

  const handleTriggerHumanSupport = (customIssue?: string) => {
    const store = pharmacyName || business?.name || tenant?.name || 'Our Pharmacy';
    const textMsg = encodeURIComponent(
      `Assalam-o-Alaikum MBI Support! Need assistance for store: ${store}${customIssue ? ` - Issue: ${customIssue}` : ''}`
    );
    window.open(`https://wa.me/923281302636?text=${textMsg}`, '_blank');

    const systemPrompt: ChatMessage = {
      id: `sys-${Date.now()}`,
      sender: 'ai',
      isSupportConfirmed: true,
      text: `📞 **WhatsApp Human Support Dispatched**\n\nConnected directly to MBI 24/7 Helpline (+92 328 1302636) for **${store}**.\n\nOur Master Admin support team is ready on WhatsApp. You can also call us directly at **0336-4585863**.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, systemPrompt]);
  };

  const generateLocalResponse = (query: string): string => {
    const lower = query.toLowerCase();

    // 1. Human support request
    if (lower.includes('human') || lower.includes('support') || lower.includes('admin') || lower.includes('call') || lower.includes('bilal') || lower.includes('phone') || lower.includes('help')) {
      setTimeout(() => setShowSupportForm(true), 600);
      return `📞 **Human Support Handover Triggered**\n\nI have opened the priority support dispatch form for you below. You can also reach our 24/7 Helpline directly:\n- **Hotline 1:** 0336-4585863\n- **Hotline 2 / WhatsApp:** 0328-1302636\n\nPlease fill your contact number to submit an instant escalation.`;
    }

    // 2. Generic medicine alternatives
    if (lower.includes('augmentin') || lower.includes('amoxicillin') || lower.includes('clavulanate') || lower.includes('generic')) {
      return `💊 **Augmentin Generic & Market Alternatives (Pakistan)**\n\n- **Active Formula:** Co-Amoxiclav (Amoxicillin Trihydrate + Potassium Clavulanate)\n- **Standard Strengths:** 375mg, 625mg, 1g Tabs | 156.25mg, 312.5mg, 457mg Susp\n\n**Top Quality Market Alternatives:**\n1. **Curam** (Novartis / Sandoz)\n2. **Klavox** (Bosch Pharma)\n3. **Amoxi-Clav** (AGP Pharma)\n4. **Augmax** (Highnoon Laboratories)\n\n*💡 POS Tip: Use Fast Multi-Item Search (F2) to view real-time batch stock and cost margins.*`;
    }

    // 3. FEFO Expiry Radar
    if (lower.includes('fefo') || lower.includes('expiry') || lower.includes('radar') || lower.includes('batch')) {
      return `⏰ **FEFO (First-Expiry, First-Out) Smart Radar**\n\n- **Rule:** The system always auto-selects and prompts batches nearest to expiry date on POS billing.\n- **Expiry Alerts:** 30, 60, and 90-day threshold warnings keep you ahead of supplier return windows.\n- **Financial Safety:** Eliminates dead inventory write-offs and protects store gross margins.\n\n*View near-expiry batches anytime in Items > Expiry Radar.*`;
    }

    // 4. POS Shortcuts
    if (lower.includes('shortcut') || lower.includes('f1') || lower.includes('f2') || lower.includes('pos')) {
      return `⚡ **Essential MBI POS Keyboard Shortcuts**\n\n- \`Alt + S\` : Open New Sale Invoice instantly\n- \`Alt + P\` : Open New Purchase Bill\n- \`F2\` / \`Tab\` : Focus Fast Product & Barcode Search\n- \`F1\` / \`Ctrl + Enter\` : Open Keyboard Shortcuts Hub\n- \`Alt + L\` : Security Audit Log Vault (Admin PIN Protected)\n- \`Esc\` : Close any active modal or return to register`;
    }

    // 5. HWID & Server
    if (lower.includes('hwid') || lower.includes('hardware') || lower.includes('lock') || lower.includes('device')) {
      return `🛡️ **Single-Device HWID Security Protocol**\n\n- Each license is cryptographically bound to 1 physical machine (CPU + Motherboard + Disk).\n- If a device is replaced or damaged, Master Admin can release the hardware lock in Server Command Hub > Device Auth.\n- Midnight Cloud Backups restore 100% store state without loss.`;
    }

    // General fallback
    return `✨ **MBI Copilot Response**\n\nI have analyzed your query regarding *"${query}"*.\n\n- **POS Operations:** You can execute retail sales (\`Alt+S\`), stock purchases (\`Alt+P\`), and cashier shifts directly.\n- **Data Security:** All records are stored offline locally with automated cloud sync.\n\nNeed personalized assistance? Click **Request Human Support** to connect directly with our Master Support team.`;
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputText('');
    setLoading(true);

    try {
      // Simulate intelligent copilot response delay
      await new Promise(r => setTimeout(r, 600));
      const responseText = generateLocalResponse(userMsg.text);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: '⚠️ Unable to process query. Please check connection or click Human Support.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportPhone.trim() || !supportName.trim()) return;

    setSubmittingTicket(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      setShowSupportForm(false);

      const confirmationMsg: ChatMessage = {
        id: `conf-${Date.now()}`,
        sender: 'ai',
        isSupportConfirmed: true,
        text: `✅ **Support Request Queued Successfully!**\n\n- **Store:** ${pharmacyName}\n- **Contact Person:** ${supportName}\n- **WhatsApp:** ${supportPhone}\n- **Query:** ${supportIssue || 'Priority Human Support Request'}\n\nOur Master Support Team will contact your WhatsApp shortly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, confirmationMsg]);
    } finally {
      setSubmittingTicket(false);
    }
  };

  if (!isOpen) return null;

  // 1-Click Interactive Quick Action Chips
  const userPromptChips = [
    { label: '📞 Request Human Support', prompt: 'Human Support', isAction: true },
    { label: '💊 Generic for Augmentin', prompt: 'What is the generic salt formula and alternative brands for Augmentin 625mg in Pakistan?' },
    { label: '⏰ FEFO Expiry Radar', prompt: 'Explain how 30/60/90 days FEFO batch expiry alerts protect pharmacy profits.' },
    { label: '⚡ POS F2 Shortcuts', prompt: 'List the fastest keyboard shortcuts for high-speed POS retail checkout (F1, F2, Tab, Enter).' },
  ];

  const serverPromptChips = [
    { label: '📞 Request Human Support', prompt: 'Human Support', isAction: true },
    { label: '🛡️ Reset Bound HWID', prompt: 'How do I reset bound HWID for a damaged client laptop to restore 100% data from midnight backup?' },
    { label: '💾 12:00 AM Midnight Backup', prompt: 'Explain the automated 12:00 AM midnight per-tenant encrypted backup and disaster recovery process.' },
    { label: '⚡ Multi-Tenant Isolation', prompt: 'How does MBI INVENTRA isolate tenant databases, user permissions, and pharmacy inventory records?' },
  ];

  const activeChips = isServerRoute ? serverPromptChips : userPromptChips;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop Overlay for all screen sizes */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity" 
      />

      {/* Slide-over Container with highest z-index */}
      <aside className="fixed top-0 right-0 h-screen w-full sm:w-[420px] z-[9999] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300 text-slate-800 dark:text-slate-100">
        {/* Fixed Header Bar */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✨</span>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">MBI AI Copilot</h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">● Pharmacy Assistant Online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearChat}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 text-lg transition-colors cursor-pointer"
              title="Close Assistant"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quick Action Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 no-scrollbar bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          {activeChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (chip.isAction || chip.prompt === 'Human Support') {
                  handleTriggerHumanSupport();
                } else {
                  handleSendMessage(chip.prompt);
                }
              }}
              disabled={loading}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shadow-2xs shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                chip.isAction
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-500/20'
                  : 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300'
              }`}
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc] dark:bg-slate-950/60 custom-scrollbar">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm relative group ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : msg.isSupportConfirmed
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-800 rounded-tl-none'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                }`}>
                  {renderFormattedText(msg.text)}

                  <div className={`mt-2 flex items-center justify-between text-[10px] gap-2 ${
                    isUser ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="opacity-70 hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                        title="Copy Answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl bg-slate-700 dark:bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* INLINE HUMAN SUPPORT HANDOVER FORM */}
          {showSupportForm && (
            <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 shadow-lg animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-indigo-100 dark:border-indigo-900/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">Human Support Dispatch</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Direct connection to Master Admin Desk</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSupportForm(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitSupportTicket} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      placeholder="Owner Name"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp No *</label>
                    <input
                      type="text"
                      required
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="03001234567"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">Query / Issue</label>
                  <textarea
                    rows={2}
                    value={supportIssue}
                    onChange={(e) => setSupportIssue(e.target.value)}
                    placeholder="Briefly describe your query..."
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submittingTicket || !supportPhone.trim() || !supportName.trim()}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingTicket ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Queuing Ticket...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Request</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSupportForm(false)}
                    className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TYPING INDICATOR */}
          {loading && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                <span className="ml-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">Drafting response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. INPUT BAR */}
        <footer className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500 rounded-xl p-1.5 flex items-center gap-1.5 transition-all shadow-xs border border-slate-200 dark:border-slate-700"
          >
            <input
              type="text"
              placeholder={isServerRoute ? 'Ask Master Fleet Copilot...' : 'Ask about generics, FEFO expiry, or shortcuts...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent border-0 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer disabled:opacity-40 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-2 px-1">
            <span>✨ MBI AI • Multi-Lingual Copilot</span>
            <button
              type="button"
              onClick={() => handleTriggerHumanSupport()}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Headphones className="w-3 h-3" />
              <span>Live Support</span>
            </button>
          </div>
        </footer>

      </aside>
    </>
  );
};
