import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  X, Send, Sparkles, Trash2, Bot, User, 
  MessageSquare, Copy, Check,
  Headphones, PhoneCall, RefreshCw, Zap,
  ChevronRight, ArrowRight, ShieldCheck, HelpCircle,
  Minimize2, ExternalLink, Lock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  isSupportForm?: boolean;
  isSupportConfirmed?: boolean;
  isLimitReached?: boolean;
}

interface MbiAiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegisterModal?: () => void;
}

const MAX_HOME_QUESTIONS = 15;

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

export const MbiAiChatDrawer: React.FC<MbiAiChatDrawerProps> = ({ 
  isOpen, 
  onClose,
  onOpenRegisterModal 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenant, business, currentUser } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isHomePage = location.pathname === '/' || location.pathname === '/home';
  const isServerRoute = location.pathname.startsWith('/server') || location.pathname.startsWith('/master');
  const pharmacyName = business?.name || tenant?.name || 'My Pharmacy';
  const userFullName = currentUser?.name || (currentUser as any)?.displayName || 'Pharmacy Owner';
  const userPhoneAddress = (currentUser as any)?.phone || business?.mobile || business?.phone || '';

  // 15 Free Questions session tracker for Home Page / Public Visitor
  const [questionsUsed, setQuestionsUsed] = useState<number>(() => {
    if (!isHomePage || currentUser) return 0;
    try {
      const stored = localStorage.getItem('mbi_home_ai_questions_count');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  const remainingQuestions = Math.max(0, MAX_HOME_QUESTIONS - questionsUsed);
  const isLimitReached = isHomePage && !currentUser && remainingQuestions <= 0;

  // Initial welcome message based on context
  const getInitialMessage = (): ChatMessage => {
    if (isServerRoute) {
      return {
        id: 'welcome-msg-server',
        sender: 'ai',
        text: `🛡️ **MBI Master Fleet Copilot Active**\nI can assist you with multi-tenant telemetry, HWID device license resets, automated disaster recovery backups, and cloud switchboard management. How can I help?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }

    if (isHomePage && !currentUser) {
      return {
        id: 'welcome-msg-home',
        sender: 'ai',
        text: `✨ **Assalam-o-Alaikum! Welcome to MBI Inventra AI Copilot.**\n\nI am your intelligent Pharmacy POS & ERP assistant. You can ask up to **15 free questions** about generic medicine formulas, FEFO expiry calculations, POS billing shortcuts, or cloud sync.\n\nHow can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }

    return {
      id: 'welcome-msg-user',
      sender: 'ai',
      text: `✨ **Assalam-o-Alaikum! I am MBI AI, your Pharmacy POS & ERP Copilot.**\nI can find generic medicine alternatives, explain FEFO expiry rules, guide POS billing shortcuts (Alt+S / F2), or connect you with Master Admin Support. How can I help?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const storageKey = isHomePage && !currentUser 
      ? 'mbi_ai_chat_home' 
      : `mbi_ai_chat_${isServerRoute ? 'server' : 'user'}`;
    
    const saved = localStorage.getItem(storageKey);
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
      const storageKey = isHomePage && !currentUser 
        ? 'mbi_ai_chat_home' 
        : `mbi_ai_chat_${isServerRoute ? 'server' : 'user'}`;
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
    } catch (e) {}
  }, [messages, isServerRoute, isHomePage, currentUser]);

  const handleCopy = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleClearChat = () => {
    const welcome = getInitialMessage();
    setMessages([welcome]);
    setShowSupportForm(false);
    const storageKey = isHomePage && !currentUser 
      ? 'mbi_ai_chat_home' 
      : `mbi_ai_chat_${isServerRoute ? 'server' : 'user'}`;
    localStorage.removeItem(storageKey);
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
      text: `📞 **WhatsApp Human Support Dispatched**\n\nConnected directly to MBI 24/7 Helpline (+92 328 1302636) for **${store}**.\n\nOur Master Admin support team is available on WhatsApp. You can also call us directly at **0336-4585863**.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, systemPrompt]);
  };

  const generateLocalResponse = (query: string): string => {
    const lower = query.toLowerCase();

    // 1. Human support request
    if (lower.includes('human') || lower.includes('support') || lower.includes('admin') || lower.includes('call') || lower.includes('bilal') || lower.includes('phone') || lower.includes('help') || lower.includes('contact')) {
      setTimeout(() => setShowSupportForm(true), 600);
      return `📞 **Human Support Handover Triggered**\n\nI have opened the priority support dispatch form for you below. You can also reach our 24/7 Helpline directly:\n- **WhatsApp Support:** +92 328 1302636\n- **Direct Hotline:** 0336-4585863\n\nPlease fill your contact details to submit an instant inquiry.`;
    }

    // 2. Generic medicine formulas & alternatives in Pakistan
    if (lower.includes('augmentin') || lower.includes('amoxicillin') || lower.includes('clavulanate')) {
      return `💊 **Augmentin Generic Formula & Alternatives (Pakistan)**\n\n- **Active Formula:** Co-Amoxiclav (Amoxicillin Trihydrate + Potassium Clavulanate)\n- **Standard Strengths:** 375mg, 625mg, 1g Tabs | 156.25mg, 312.5mg, 457mg Susp\n\n**Top Quality Market Alternatives:**\n1. **Curam** (Novartis / Sandoz)\n2. **Klavox** (Bosch Pharma)\n3. **Amoxi-Clav** (AGP Pharma)\n4. **Augmax** (Highnoon Laboratories)\n\n*💡 POS Tip: Use Fast Multi-Item Search (F2) on POS to view real-time batch stock and cost margins.*`;
    }

    if (lower.includes('panadol') || lower.includes('paracetamol') || lower.includes('calpol') || lower.includes('febrol')) {
      return `💊 **Panadol Generic Formula & Market Equivalents**\n\n- **Active Salt:** Paracetamol (Acetaminophen 500mg / 665mg CF / Forte)\n- **Common Uses:** Analgesic & Antipyretic (Pain & Fever relief)\n\n**Top Market Alternatives in Pakistan:**\n1. **Calpol** (GSK)\n2. **Febrol** (SAMI Pharmaceuticals)\n3. **Disprol** (Reckitt Benckiser)\n4. **Paramol** (Bosch)\n\n*All alternatives share 100% bio-equivalent API.*`;
    }

    if (lower.includes('risek') || lower.includes('omeprazole') || lower.includes('omega') || lower.includes('oprazole')) {
      return `💊 **Risek Generic Formula & Top Brands**\n\n- **Active Formula:** Omeprazole (20mg, 40mg Caps / Insta Sachet)\n- **Therapeutic Class:** Proton Pump Inhibitor (PPI - Acidity & GERD)\n\n**Top Pakistani Market Brands:**\n1. **Risek** (Getz Pharma)\n2. **Omega** (Ferozsons Laboratories)\n3. **Proton** (Bosch Pharmaceuticals)\n4. **Oprazole** (AGP Pharma)`;
    }

    if (lower.includes('sofvasc') || lower.includes('amlodipine') || lower.includes('norvasc')) {
      return `💊 **Sofvasc Generic Formula & Alternatives**\n\n- **Active Formula:** Amlodipine Besylate (2.5mg, 5mg, 10mg Tabs)\n- **Therapeutic Class:** Calcium Channel Blocker (Hypertension & Angina)\n\n**Top Market Brands:**\n1. **Sofvasc / Sofvasc-V** (Searle)\n2. **Norvasc** (Pfizer)\n3. **Lodipin** (Sami Pharma)\n4. **Amlo** (Getz Pharma)`;
    }

    // 3. FEFO Expiry Radar
    if (lower.includes('fefo') || lower.includes('expiry') || lower.includes('radar') || lower.includes('waste') || lower.includes('near expiry')) {
      return `⏰ **FEFO (First-Expiry, First-Out) Smart Profit Radar**\n\n- **Automated POS Dispensing:** System prioritizes batches closest to expiry date during retail sale billing.\n- **30/60/90-Day Warning Horizon:** Automated radar tags stock approaching expiration for timely return to medicine distributors.\n- **Profit Protection:** Eliminates dead inventory dump write-offs and protects 18-22% net retail margin.\n\n*Test this live on the Home page FEFO Interactive Calculator!*`;
    }

    // 4. POS Shortcuts
    if (lower.includes('shortcut') || lower.includes('f1') || lower.includes('f2') || lower.includes('pos') || lower.includes('keyboard')) {
      return `⚡ **Essential MBI POS Fast Billing Shortcuts**\n\n- \`Alt + S\` : Open New Sale Invoice instantly\n- \`Alt + P\` : Open New Purchase Bill Inward\n- \`F2\` / \`Tab\` : Focus Instant Medicine & Barcode Search\n- \`F1\` : Open Keyboard Shortcuts Master Guide\n- \`Enter\` : Rapid Line-Item Addition\n- \`Esc\` : Minimize or Close Active Transaction Dock\n\n*Engineered for high-volume rush hours with 0.2s transaction speed.*`;
    }

    // 5. Offline & Cloud Sync
    if (lower.includes('offline') || lower.includes('internet') || lower.includes('sync') || lower.includes('cloud') || lower.includes('backup')) {
      return `🌐 **Offline-First PWA + Instant Cloud Synapse**\n\n- **100% Offline Billing:** Works without active internet using browser IndexedDB storage.\n- **Zero-Latency Invoicing:** Print 80mm/58mm thermal receipts offline continuously.\n- **Auto Cloud Synapse:** As soon as internet reconnects, all pending invoices and ledgers auto-sync securely to your cloud database.`;
    }

    // 6. Pricing & Plans
    if (lower.includes('price') || lower.includes('cost') || lower.includes('plan') || lower.includes('free trial') || lower.includes('trial') || lower.includes('package')) {
      return `💳 **MBI Inventra Transparent Pricing & Trial**\n\n- **10-Day Free Trial:** Rs. 0 (Includes 100 sales bills, offline POS, smart stock ledger)\n- **Basic Plan (Silver):** Rs. 15,000 / Lifetime (1 PC License, Offline POS, Thermal Receipts)\n- **Business Pro (Gold):** Rs. 28,000 / Lifetime (Multi-Branch, Cloud Synapse, AI Copilot, FEFO Radar)\n- **Enterprise Ultimate:** Rs. 45,000 / Lifetime (Multi-Terminal, Custom Branding, WhatsApp Gateways, Dedicated Priority Server)`;
    }

    // General fallback
    return `✨ **MBI AI Copilot Response**\n\nI have analyzed your query regarding *"${query}"*.\n\n- **POS Operations:** You can execute retail sales (\`Alt+S\`), stock purchases (\`Alt+P\`), and customer khata ledgers directly.\n- **Data Security:** All records are stored offline locally with automated cloud backup.\n\nNeed direct assistance? Click **Request Human Support** or start your **10-Day Free Trial** today!`;
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || loading) return;

    if (isLimitReached) return;

    // Check Home page 15-question limit
    if (isHomePage && !currentUser) {
      const nextCount = questionsUsed + 1;
      setQuestionsUsed(nextCount);
      try {
        localStorage.setItem('mbi_home_ai_questions_count', nextCount.toString());
      } catch {}

      if (nextCount >= MAX_HOME_QUESTIONS) {
        // Record final question
        const userMsg: ChatMessage = {
          id: `usr-${Date.now()}`,
          sender: 'user',
          text: textToSend.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        if (!customText) setInputText('');
        setLoading(true);

        setTimeout(() => {
          const finalMsg: ChatMessage = {
            id: `limit-${Date.now()}`,
            sender: 'ai',
            isLimitReached: true,
            text: `🎉 **15 Free Visitor Questions Completed!**\n\nYou have utilized all 15 free AI queries for this preview session.\n\nReady to experience the full power of MBI Inventra? Activate your **10-Day Free Trial** to unlock **Unlimited AI Copilot**, 0.2s POS billing, automated FEFO expiry alerts, and offline cloud sync!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, finalMsg]);
          setLoading(false);
        }, 600);
        return;
      }
    }

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
      // Simulate fast intelligent response delay
      await new Promise(r => setTimeout(r, 450));
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
        text: '⚠️ Unable to process query. Please check your connection or click Human Support.',
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
      await new Promise(r => setTimeout(r, 600));
      setShowSupportForm(false);

      const confirmationMsg: ChatMessage = {
        id: `conf-${Date.now()}`,
        sender: 'ai',
        isSupportConfirmed: true,
        text: `✅ **Support Request Queued Successfully!**\n\n- **Store:** ${pharmacyName}\n- **Contact Person:** ${supportName}\n- **WhatsApp:** ${supportPhone}\n- **Query:** ${supportIssue || 'Priority Human Support Request'}\n\nOur Master Support Team (+92 328 1302636) will contact your WhatsApp shortly.`,
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
    { label: '📞 Human Support', prompt: 'Human Support', isAction: true },
    { label: '💊 Generic for Augmentin', prompt: 'What is the generic salt formula and alternative brands for Augmentin 625mg in Pakistan?' },
    { label: '⏰ FEFO Expiry Radar', prompt: 'Explain how 30/60/90 days FEFO batch expiry alerts protect pharmacy profits.' },
    { label: '⚡ POS Shortcuts (F2)', prompt: 'List the fastest keyboard shortcuts for high-speed POS retail checkout (Alt+S, Alt+P, F2, Tab).' },
    { label: '🌐 Offline PWA & Sync', prompt: 'How does MBI Inventra work 100% offline during internet disconnection?' },
  ];

  const serverPromptChips = [
    { label: '📞 Human Support', prompt: 'Human Support', isAction: true },
    { label: '🛡️ Reset Bound HWID', prompt: 'How do I reset bound HWID for a client laptop to restore data from cloud backup?' },
    { label: '💾 12:00 AM Midnight Backup', prompt: 'Explain the automated 12:00 AM midnight per-tenant encrypted backup and disaster recovery process.' },
    { label: '⚡ Multi-Tenant Isolation', prompt: 'How does MBI INVENTRA isolate tenant databases, user permissions, and pharmacy inventory records?' },
  ];

  const activeChips = isServerRoute ? serverPromptChips : userPromptChips;

  return (
    <>
      {/* 
        NO FULLSCREEN BLUR OVERLAY: 
        Desktop / Tablet opens as a floating bottom-right assistant card without darkening or blurring the website.
        Mobile renders as a sleek bottom sheet.
      */}
      <aside 
        className="fixed z-[9999] bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800/90 text-slate-800 dark:text-slate-100 flex flex-col overflow-hidden transition-all duration-300
        sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[620px] sm:max-h-[85vh] sm:rounded-3xl sm:ring-1 sm:ring-black/5 dark:sm:ring-white/10
        bottom-0 left-0 right-0 h-[85vh] max-sm:rounded-t-3xl"
      >
        {/* Sleek Floating Header */}
        <div className="h-16 flex items-center justify-between px-4 sm:px-5 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/90 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">MBI AI Copilot</h3>
                {isHomePage && !currentUser ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {remainingQuestions} / {MAX_HOME_QUESTIONS} Left
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Pro Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Pharmacy AI Online</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80 no-scrollbar bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
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
              disabled={loading || (isLimitReached && !chip.isAction)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shadow-2xs shrink-0 cursor-pointer disabled:opacity-40 flex items-center gap-1 ${
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]/90 dark:bg-slate-950/70 custom-scrollbar">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm relative group ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : msg.isLimitReached
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white rounded-tl-none'
                    : msg.isSupportConfirmed
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-800 rounded-tl-none'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                }`}>
                  {renderFormattedText(msg.text)}

                  {/* Limit Reached Action Card */}
                  {msg.isLimitReached && (
                    <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/80 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenRegisterModal) {
                            onOpenRegisterModal();
                          } else {
                            navigate('/register');
                          }
                          onClose();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Start Free 10-Day Trial (Unlimited)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTriggerHumanSupport()}
                        className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Headphones className="w-3.5 h-3.5 text-blue-500" />
                        <span>WhatsApp Master Support</span>
                      </button>
                    </div>
                  )}

                  <div className={`mt-2 flex items-center justify-between text-[10px] gap-2 ${
                    isUser ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {!isUser && !msg.isLimitReached && (
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
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* INLINE HUMAN SUPPORT HANDOVER FORM */}
          {showSupportForm && (
            <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-3.5 shadow-lg animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-indigo-100 dark:border-indigo-900/60">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Headphones className="w-3.5 h-3.5" />
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
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSupportTicket} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                      placeholder="Owner Name"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">WhatsApp No *</label>
                    <input
                      type="text"
                      required
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="03001234567"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Query / Requirement</label>
                  <textarea
                    rows={2}
                    value={supportIssue}
                    onChange={(e) => setSupportIssue(e.target.value)}
                    placeholder="Describe your pharmacy software requirement..."
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submittingTicket || !supportPhone.trim() || !supportName.trim()}
                    className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingTicket ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Queuing Request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>Send to WhatsApp Desk</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSupportForm(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TYPING INDICATOR */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 shadow-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                <span className="ml-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FOOTER */}
        <footer className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500 rounded-2xl p-1.5 flex items-center gap-1.5 transition-all shadow-xs border border-slate-200 dark:border-slate-700"
          >
            <input
              type="text"
              placeholder={
                isLimitReached
                  ? '15 Free questions used. Start Free Trial for unlimited AI access...'
                  : isServerRoute 
                  ? 'Ask Master Fleet Copilot...' 
                  : 'Ask about generics, FEFO expiry, or shortcuts...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading || isLimitReached}
              className="flex-1 bg-transparent border-0 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading || isLimitReached}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-40 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-2 px-1">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>
                {isHomePage && !currentUser 
                  ? `${remainingQuestions} of 15 free questions remaining` 
                  : 'MBI AI • Multi-Lingual Copilot'}
              </span>
            </div>
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

export default MbiAiChatDrawer;
