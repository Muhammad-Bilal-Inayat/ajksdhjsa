import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { saveAiChatLogToMariaDb, getAiChatHistoryFromMariaDb, syncRecordToMariaDb } from '../db/mariaClient';
import { isSecurityViolationQuery, matchGenericAlternative } from '../controllers/aiDataQueryEngine';

export { getAiChatHistoryFromMariaDb };

// System default keys provided by user for rotation
const INITIAL_KEYS = [
  'AQ.Ab8RN6J41zAkRs-AxOHStQ3XEF5x8SRnRZ-kdc74FPc0jeT9xA',
  'AQ.Ab8RN6L0k5gS_ygV9Vr4N0gNbSw99uvgMqZoYJp4_DYX-dMbWQ',
  'AQ.Ab8RN6IhctgzNIM2bMcMuF6jbSgye6yXsS9VAW5aJMCJJcOSqw'
];

export interface AiSettings {
  isAiEnabledGlobally: boolean;
  allowedPlans: {
    basic: boolean;
    business: boolean;
    enterprise: boolean;
  };
  customKeys: string[];
  homePageEnabled: boolean;
  autoGreeting?: string;
  humanSupportNumber?: string;
}

export interface SupportLead {
  id: string;
  businessName: string;
  userEmail: string;
  phone: string;
  question: string;
  plan: string;
  createdAt: string;
  status: 'pending' | 'contacted' | 'resolved';
  notes?: string;
}

export interface KeyHealthMetric {
  key: string;
  maskedKey: string;
  status: 'Healthy' | 'Rate-Limited' | 'Error' | 'Unverified';
  requestsCount: number;
  errorCount: number;
  lastUsed: string;
  lastError?: string;
}

export interface ClickEvent {
  id: string;
  sessionId: string;
  eventType: 'widget_open' | 'widget_close' | 'prompt_chip_click' | 'message_sent' | 'voice_input' | 'human_escalate_click' | 'phone_click' | 'whatsapp_click' | 'plan_upgrade_click' | 'feedback_click';
  eventLabel: string;
  userId?: string;
  userName?: string;
  storeName?: string;
  tenantId?: string;
  userPlan?: string;
  pageContext?: 'home' | 'user' | 'store' | 'checkout';
  timestamp: string;
  ip?: string;
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'human_agent';
  senderName: string;
  text: string;
  timestamp: string;
  isEscalation?: boolean;
  requiresUpgrade?: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

export interface ChatSession {
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

const CONFIG_FILE = path.resolve(process.cwd(), '.ai_assistant_config.json');
const LEADS_FILE = path.resolve(process.cwd(), '.ai_support_leads.json');
const CLICKS_FILE = path.resolve(process.cwd(), '.ai_assistant_telemetry.json');
const SESSIONS_FILE = path.resolve(process.cwd(), '.ai_chat_sessions.json');

// In-memory key stats tracking
const keyHealthStats: Record<string, KeyHealthMetric> = {};

function getOrInitKeyStat(key: string): KeyHealthMetric {
  if (!keyHealthStats[key]) {
    keyHealthStats[key] = {
      key,
      maskedKey: `${key.substring(0, 10)}...${key.substring(key.length - 6)}`,
      status: 'Unverified',
      requestsCount: 0,
      errorCount: 0,
      lastUsed: 'Never'
    };
  }
  return keyHealthStats[key];
}

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
export function loadSettings(): AiSettings {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return {
        isAiEnabledGlobally: data.isAiEnabledGlobally ?? true,
        allowedPlans: data.allowedPlans ?? { basic: true, business: true, enterprise: true },
        customKeys: Array.isArray(data.customKeys) && data.customKeys.length > 0 ? data.customKeys : INITIAL_KEYS,
        homePageEnabled: data.homePageEnabled ?? true,
        autoGreeting: data.autoGreeting || 'Assalam-o-Alaikum! Main MBI AI Guide aur Live Support Assistant hoon. Main aapki kya madad kar sakta hoon?',
        humanSupportNumber: data.humanSupportNumber || '+923001234567'
      };
    }
  } catch (err) {
    console.error('Error reading AI settings config:', err);
  }

  return {
    isAiEnabledGlobally: true,
    allowedPlans: { basic: true, business: true, enterprise: true },
    customKeys: INITIAL_KEYS,
    homePageEnabled: true,
    autoGreeting: 'Assalam-o-Alaikum! Main MBI AI Guide aur Live Support Assistant hoon. Main aapki kya madad kar sakta hoon?',
    humanSupportNumber: '+923001234567'
  };
}

export function saveSettings(settings: Partial<AiSettings>) {
  try {
    const current = loadSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving AI settings config:', err);
  }
}

// ----------------------------------------------------
// LEADS
// ----------------------------------------------------
function loadLeads(): SupportLead[] {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading AI leads:', err);
  }
  return [];
}

export function saveLeads(leads: SupportLead[]) {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving AI leads:', err);
  }
}

export function addSupportLead(lead: Omit<SupportLead, 'id' | 'createdAt' | 'status'>): SupportLead {
  const leads = loadLeads();
  const newLead: SupportLead = {
    ...lead,
    id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  leads.unshift(newLead);
  saveLeads(leads);
  return newLead;
}

export function getSupportLeads(): SupportLead[] {
  return loadLeads();
}

export function updateLeadStatus(id: string, status: 'pending' | 'contacted' | 'resolved', notes?: string) {
  const leads = loadLeads();
  const lead = leads.find(l => l.id === id);
  if (lead) {
    lead.status = status;
    if (notes !== undefined) lead.notes = notes;
    saveLeads(leads);
  }
  return lead;
}

// ----------------------------------------------------
// TELEMETRY & CLICKS ENGINE
// ----------------------------------------------------
function loadClickEvents(): ClickEvent[] {
  try {
    if (fs.existsSync(CLICKS_FILE)) {
      return JSON.parse(fs.readFileSync(CLICKS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading AI click events:', err);
  }
  return [];
}

function saveClickEvents(events: ClickEvent[]) {
  try {
    // Keep max 2000 events in memory/file to avoid excessive file size
    const capped = events.slice(0, 2000);
    fs.writeFileSync(CLICKS_FILE, JSON.stringify(capped, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving AI click events:', err);
  }
}

export function recordClickEvent(event: Omit<ClickEvent, 'id' | 'timestamp'>): ClickEvent {
  const events = loadClickEvents();
  const newEvent: ClickEvent = {
    ...event,
    id: `clk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString()
  };
  events.unshift(newEvent);
  saveClickEvents(events);

  // If there's a matching session, increment its click counter
  if (newEvent.sessionId) {
    incrementSessionClicks(newEvent.sessionId);
  }

  // Also persist to MariaDB mbi_audit_logs asynchronously
  syncRecordToMariaDb('auditLogs', {
    id: newEvent.id,
    tenantId: newEvent.tenantId || 'default',
    userId: newEvent.userId || null,
    userName: newEvent.userName || 'Visitor',
    action: `CLICK_${newEvent.eventType.toUpperCase()}`,
    category: 'AI_TELEMETRY',
    details: {
      eventLabel: newEvent.eventLabel,
      sessionId: newEvent.sessionId,
      userPlan: newEvent.userPlan,
      pageContext: newEvent.pageContext,
      metadata: newEvent.metadata
    },
    ipAddress: newEvent.ip || null
  }).catch(() => {});

  return newEvent;
}

export function getClickTelemetryAnalytics() {
  const events = loadClickEvents();
  const sessions = loadChatSessions();

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const todayDateStr = new Date().toISOString().slice(0, 10);

  const totalClicks = events.length;
  const todayClicks = events.filter(e => e.timestamp.startsWith(todayDateStr)).length;
  const last24hClicks = events.filter(e => new Date(e.timestamp).getTime() >= oneDayAgo).length;

  const eventTypeCounts: Record<string, number> = {
    widget_open: 0,
    prompt_chip_click: 0,
    message_sent: 0,
    human_escalate_click: 0,
    voice_input: 0,
    plan_upgrade_click: 0,
    phone_click: 0,
    whatsapp_click: 0
  };

  const pageContextCounts: Record<string, number> = {
    home: 0,
    user: 0,
    store: 0,
    checkout: 0
  };

  const storeClicks: Record<string, number> = {};

  for (const e of events) {
    if (eventTypeCounts[e.eventType] !== undefined) {
      eventTypeCounts[e.eventType]++;
    } else {
      eventTypeCounts[e.eventType] = 1;
    }

    const ctx = e.pageContext || 'user';
    pageContextCounts[ctx] = (pageContextCounts[ctx] || 0) + 1;

    const store = e.storeName || e.userName || 'Anonymous Visitor';
    storeClicks[store] = (storeClicks[store] || 0) + 1;
  }

  const topStores = Object.entries(storeClicks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Sessions stats
  const activeSessionsCount = sessions.filter(s => s.status !== 'resolved').length;
  const pendingHumanEscalations = sessions.filter(s => s.status === 'human_escalation_requested').length;
  const activeHumanChats = sessions.filter(s => s.status === 'human_active').length;
  const resolvedSessionsCount = sessions.filter(s => s.status === 'resolved').length;

  return {
    totalClicks,
    todayClicks,
    last24hClicks,
    eventTypeCounts,
    pageContextCounts,
    topStores,
    sessionsOverview: {
      totalSessions: sessions.length,
      activeSessionsCount,
      pendingHumanEscalations,
      activeHumanChats,
      resolvedSessionsCount
    },
    recentEvents: events.slice(0, 40)
  };
}

// ----------------------------------------------------
// LIVE TWO-WAY CHAT SESSIONS (AI & HUMAN OPERATOR TAKEOVER)
// ----------------------------------------------------
function loadChatSessions(): ChatSession[] {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading AI chat sessions:', err);
  }
  return [];
}

function saveChatSessions(sessions: ChatSession[]) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving AI chat sessions:', err);
  }
}

export function getOrCreateChatSession(params: {
  sessionId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  storeName?: string;
  tenantId?: string;
  plan?: string;
  pageContext?: 'home' | 'user' | 'store' | 'checkout';
}): ChatSession {
  const sessions = loadChatSessions();
  let session = sessions.find(s => s.id === params.sessionId);

  if (!session) {
    const defaultGreeting = loadSettings().autoGreeting || 'Assalam-o-Alaikum! Main MBI AI Guide aur Live Support Assistant hoon. Main aapki kya madad kar sakta hoon?';
    
    session = {
      id: params.sessionId,
      userId: params.userId || 'usr_client',
      userName: params.userName || 'Pharmacy Partner',
      userEmail: params.userEmail || '',
      userPhone: params.userPhone || '',
      storeName: params.storeName || 'Pharmacy Store',
      tenantId: params.tenantId || 'tenant-01',
      plan: params.plan || 'Business / Pro',
      pageContext: params.pageContext || 'user',
      status: 'active_ai',
      isHumanAssigned: false,
      totalClicks: 1,
      unreadCountForServer: 0,
      unreadCountForUser: 0,
      lastMessage: defaultGreeting,
      lastMessageSender: 'ai',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          sender: 'ai',
          senderName: 'MBI AI Guide',
          text: defaultGreeting,
          timestamp: new Date().toISOString(),
          status: 'delivered'
        }
      ]
    };
    sessions.unshift(session);
    saveChatSessions(sessions);
  } else {
    // Update metadata if provided
    if (params.userName) session.userName = params.userName;
    if (params.userPhone) session.userPhone = params.userPhone;
    if (params.storeName) session.storeName = params.storeName;
    if (params.plan) session.plan = params.plan;
    session.updatedAt = new Date().toISOString();
    saveChatSessions(sessions);
  }

  return session;
}

export function incrementSessionClicks(sessionId: string) {
  const sessions = loadChatSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.totalClicks = (session.totalClicks || 0) + 1;
    session.updatedAt = new Date().toISOString();
    saveChatSessions(sessions);
  }
}

export function getAllChatSessions(filter?: 'all' | 'pending_human' | 'human_active' | 'active_ai' | 'resolved'): ChatSession[] {
  const sessions = loadChatSessions();
  if (!filter || filter === 'all') return sessions;
  if (filter === 'pending_human') return sessions.filter(s => s.status === 'human_escalation_requested');
  if (filter === 'human_active') return sessions.filter(s => s.status === 'human_active');
  if (filter === 'active_ai') return sessions.filter(s => s.status === 'active_ai');
  if (filter === 'resolved') return sessions.filter(s => s.status === 'resolved');
  return sessions;
}

export function getChatSessionById(sessionId: string): ChatSession | null {
  const sessions = loadChatSessions();
  return sessions.find(s => s.id === sessionId) || null;
}

/**
 * Add message to session:
 * If sender === 'user':
 *   - Appends message to session
 *   - Increments unreadCountForServer
 *   - Checks if user requested human support -> updates status to 'human_escalation_requested'
 * If sender === 'human_agent':
 *   - Appends message from Master Server operator
 *   - Sets isHumanAssigned: true, status: 'human_active'
 *   - Resets unreadCountForServer to 0, increments unreadCountForUser
 * If sender === 'ai':
 *   - Appends AI response
 */
export function addMessageToSession(params: {
  sessionId: string;
  sender: 'user' | 'ai' | 'human_agent';
  senderName: string;
  text: string;
  isEscalation?: boolean;
  requiresUpgrade?: boolean;
  userMeta?: {
    userId?: string;
    userName?: string;
    userPhone?: string;
    storeName?: string;
    tenantId?: string;
    plan?: string;
    pageContext?: 'home' | 'user' | 'store' | 'checkout';
  };
}): { session: ChatSession; message: ChatMessage } {
  let session = getOrCreateChatSession({
    sessionId: params.sessionId,
    ...params.userMeta
  });

  const message: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sender: params.sender,
    senderName: params.senderName,
    text: params.text,
    timestamp: new Date().toISOString(),
    isEscalation: params.isEscalation,
    requiresUpgrade: params.requiresUpgrade,
    status: 'delivered'
  };

  session.messages.push(message);
  session.lastMessage = params.text;
  session.lastMessageSender = params.sender;
  session.lastMessageAt = new Date().toISOString();
  session.updatedAt = new Date().toISOString();

  if (params.sender === 'user') {
    session.unreadCountForServer = (session.unreadCountForServer || 0) + 1;
    if (params.isEscalation) {
      session.status = 'human_escalation_requested';
    }
  } else if (params.sender === 'human_agent') {
    session.isHumanAssigned = true;
    session.status = 'human_active';
    session.assignedAgentName = params.senderName;
    session.unreadCountForServer = 0;
    session.unreadCountForUser = (session.unreadCountForUser || 0) + 1;
  } else if (params.sender === 'ai') {
    session.unreadCountForUser = (session.unreadCountForUser || 0) + 1;
  }

  const sessions = loadChatSessions();
  const idx = sessions.findIndex(s => s.id === params.sessionId);
  if (idx !== -1) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  saveChatSessions(sessions);

  // IMMUTABLE AUDIT LOGGING: Persist permanently to MariaDB mbi_ai_chat_history
  saveAiChatLogToMariaDb({
    id: message.id,
    sessionId: params.sessionId,
    tenantId: session.tenantId,
    userId: session.userId,
    userName: session.userName,
    storeName: session.storeName,
    userPlan: session.plan,
    sender: params.sender,
    senderName: params.senderName,
    text: params.text,
    isEscalation: params.isEscalation,
    pageContext: session.pageContext
  }).catch(() => {});

  return { session, message };
}

export function updateSessionStatus(
  sessionId: string, 
  status: 'active_ai' | 'human_escalation_requested' | 'human_active' | 'resolved',
  agentName?: string
): ChatSession | null {
  const sessions = loadChatSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.status = status;
    if (agentName) session.assignedAgentName = agentName;
    if (status === 'human_active') {
      session.isHumanAssigned = true;
      session.unreadCountForServer = 0;
    } else if (status === 'resolved') {
      session.unreadCountForServer = 0;
    } else if (status === 'active_ai') {
      session.isHumanAssigned = false;
    }
    session.updatedAt = new Date().toISOString();
    saveChatSessions(sessions);
    return session;
  }
  return null;
}

export function clearSession(sessionId: string): boolean {
  const sessions = loadChatSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  saveChatSessions(filtered);
  return true;
}

// ----------------------------------------------------
// KEY ROTATION & GEMINI ENGINE
// ----------------------------------------------------
let currentKeyIndex = 0;

function getKeyPool(): string[] {
  const settings = loadSettings();
  const keys = [...settings.customKeys];
  if (process.env.GEMINI_API_KEY && !keys.includes(process.env.GEMINI_API_KEY)) {
    keys.unshift(process.env.GEMINI_API_KEY);
  }
  return keys.length > 0 ? keys : INITIAL_KEYS;
}

/**
 * Test a single key health
 */
export async function testSingleKey(key: string): Promise<{ success: boolean; pingMs: number; status: 'Healthy' | 'Rate-Limited' | 'Error'; message: string }> {
  const start = Date.now();
  const stat = getOrInitKeyStat(key);
  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: 'Ping test'
    });

    const pingMs = Date.now() - start;
    stat.status = 'Healthy';
    stat.lastUsed = new Date().toLocaleTimeString();
    stat.lastError = undefined;

    return {
      success: true,
      pingMs,
      status: 'Healthy',
      message: `Key healthy! Gemini API responded in ${pingMs}ms.`
    };
  } catch (err: any) {
    const pingMs = Date.now() - start;
    const errMsg = err?.message || String(err);
    const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted');

    stat.status = isRateLimit ? 'Rate-Limited' : 'Error';
    stat.errorCount++;
    stat.lastError = errMsg;

    return {
      success: false,
      pingMs,
      status: isRateLimit ? 'Rate-Limited' : 'Error',
      message: isRateLimit ? 'Key Rate-Limited (Quota exceeded / 429).' : `Key error: ${errMsg}`
    };
  }
}

/**
 * Execute Gemini API with automatic key rotation and failover
 */
export async function generateAiResponse(
  prompt: string,
  context: 'home' | 'user' | 'store' | 'checkout' = 'user',
  userPlan: string = 'business',
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<{ text: string; humanLeadTriggered: boolean; keyIndexUsed: number }> {
  const settings = loadSettings();

  // Check global toggle
  if (!settings.isAiEnabledGlobally) {
    throw new Error('MBI AI Assistant is currently disabled globally by Server Master.');
  }

  // Check plan permission if in user workspace
  if (context === 'user') {
    const planKey = (userPlan.toLowerCase() || 'basic').includes('enterprise') || (userPlan.toLowerCase() || 'basic').includes('platinum')
      ? 'enterprise'
      : (userPlan.toLowerCase() || 'basic').includes('business') || (userPlan.toLowerCase() || 'basic').includes('gold')
      ? 'business'
      : 'basic';

    const isAllowed = settings.allowedPlans[planKey] ?? true;
    if (!isAllowed) {
      return {
        text: `MBI AI Assistant is currently paused for ${planKey.toUpperCase()} tier by Server Administrator. Please upgrade your subscription in Settings > Subscription or contact Admin.`,
        humanLeadTriggered: false,
        keyIndexUsed: 0
      };
    }
  } else if (context === 'home' && !settings.homePageEnabled) {
    throw new Error('AI Assistant on Home Page is currently offline.');
  }

  // 1. Check Security Violation / Exploit Attempt
  if (isSecurityViolationQuery(prompt)) {
    return {
      text: `⚠️ **Security Alert**: For security and compliance, internal server passwords, database credentials, and system backend codes cannot be accessed via AI chat. If you need administrative assistance, please contact the Sargodha Master Administrator.`,
      humanLeadTriggered: false,
      keyIndexUsed: 0
    };
  }

  // 2. Instant Generic Medicine & Substitution Fast-Path
  const genericMatch = matchGenericAlternative(prompt);
  if (genericMatch && context !== 'master' as any) {
    return {
      text: genericMatch,
      humanLeadTriggered: false,
      keyIndexUsed: 0
    };
  }

  // Check human support intent
  const lowerPrompt = prompt.toLowerCase();
  const humanKeywords = [
    'human', 'team', 'call', 'contact', 'support agent', 'admin se baat', 
    'team se baat', 'baat karni hai', 'number do', 'phone number', 'whatsapp', 
    'live agent', 'helpdesk', 'representative', 'person', 'madad chahye human',
    'rabta', 'operator'
  ];
  const isHumanRequested = humanKeywords.some(kw => lowerPrompt.includes(kw));

  // Key pool rotation logic
  const keyPool = getKeyPool();

  const systemInstructionHome = `
You are 'MBI AI Guide', the smart official multilingual assistant for MBI INVENTRA — Enterprise Pharmacy & POS ERP Software.
Your goal is to explain features, plans, pricing, and benefits to prospective pharmacy owners and visitors on the Home Page and Online Store.

Key Guidelines:
- Language: You can understand and respond fluently in ANY language the user writes in (English, Urdu, Roman Urdu, Hindi, Arabic, Pashto, Punjabi, French, Spanish, Turkish, etc.). Always match the exact language, dialect, and tone of the user's inquiry!
- Tone: Welcoming, highly knowledgeable, professional, friendly, and helpful.
- Platform Core Capabilities:
  1. Offline POS Billing Engine: 0-lag billing, 100% working without internet, instant local database auto-sync when online.
  2. Inventory & Batch FEFO/FIFO Rotation: Track batch expiry dates (30/60/90 days alerts), auto deduction, purchase vs retail price.
  3. Ledgers & Udhaar Management: Customer credit accounts, supplier payment vouchers, WhatsApp ledger statements.
  4. Thermal Printing: Supports 80mm, 58mm POS receipt printers, A4 invoices, customizable headers.
  5. Multi-User Staff PINs & Shift Closing: Individual staff performance tracking, cash drawer reconciliation.
  6. Bulletproof Security: Salted encrypted storage, anti-tamper console guard, device lock.
- Plans Breakdown:
  - Basic / Silver Plan: Essential local POS billing, inventory, basic receipts.
  - Business / Gold Plan: Full offline sync, batch FEFO expiry tracking, customer/supplier ledgers, staff PINs, MBI AI Guide.
  - Enterprise / Platinum Plan: Unlimited multi-branch fleet control, custom API endpoints, priority support, full audit logs, MBI AI Guide.
- Human Support: If user asks to talk to team or human support, tell them enthusiastically that you have connected them to the Live Server Support Desk and a human support representative is reviewing their chat right now!
`;

  const userPlanNormalized = (userPlan || 'business').toLowerCase();

  const systemInstructionUser = `
You are 'MBI AI Guide', the intelligent in-app multilingual assistant embedded inside MBI INVENTRA for active Pharmacy users.
The user's active subscription plan is: ${userPlanNormalized.toUpperCase()} PLAN.

Key Language & Style:
- Multilingual Support: Understand and respond fluently in ANY language the user communicates in (English, Urdu, Roman Urdu, Hindi, Arabic, Pashto, Punjabi, etc.). Match the user's chosen language naturally.

STRICT PLAN FEATURE BOUNDARIES & CONDITIONAL GUIDANCE:
- If user is on 'BASIC PLAN' / 'SILVER':
  - Active Features: Essential local POS Billing, Medicine Inventory, Thermal Printing, Shortage Book, Offline Engine.
  - Restricted Features: Batch FIFO/FEFO Expiry Alerts, Customer/Supplier Ledgers, Staff PINs, Shift Management, Sync & Share, Multi-Branch Fleet.
  - Upgrade Suggestion Policy: If the user asks about Shift Management, Sync & Share, Batch Expiry Alerts, or Udhaar Ledgers, gently inform them: "Yeh feature Business/Enterprise Plan me included hai. Upgrade karne ke liye Settings > Subscription par click karein!"
- If user is on 'BUSINESS PLAN' / 'GOLD':
  - Active Features: POS Billing, Medicine Inventory, Batch FIFO/FEFO Expiry Alerts (30/60/90 days), Customer & Supplier Ledgers, WhatsApp Statements, Staff PINs & Shift Closing/Shift Management, Sync & Share, MBI AI Assistant.
  - Restricted Features: Multi-Branch Fleet Control & Digital Online Store E-Commerce.
  - Upgrade Suggestion Policy: Provide full step-by-step help for POS, Inventory, Expiry, Ledgers, Shift Management, and Sync & Share. If they ask about Multi-Branch Fleet Control or Digital Online Store, politely inform them: "Yeh feature Enterprise Plan me included hai. Multi-branch fleet transfer ke liye Enterprise Plan unlock karein!"
- If user is on 'ENTERPRISE PLAN' / 'PLATINUM':
  - Active Features: ALL features inclusive (Multi-Branch Fleet Control, Digital Online Store, Shift Management, Sync & Share, POS Billing, Inventory, Batch Expiry, Ledgers, Unlimited Audit Trail, Priority AI).

CRITICAL BOUNDARIES:
- NEVER talk about server master credentials, backend MariaDB config files, root server databases, or internal administrative code routes.
- Focus ONLY on user-side functions relevant to their plan.

Practical Feature Guidance Examples:
1. POS Billing: Press 'F2' or click POS Billing. Scan barcode or type medicine name. Enter quantity, discount if allowed, press Enter to print thermal bill.
2. Shift Management (Business/Enterprise): Go to Cashier Shifts / POS. Click 'Open Shift', enter opening float cash. At end of day, click 'Close Shift' to reconcile drawer cash.
3. Sync & Share (Business/Enterprise): Go to Sync & Share to share live multi-terminal ledger & inventory data silently in real-time.
4. Expiry Alerts (Business/Enterprise): Go to Inventory > Batch Expiry. Yellow badge indicates 60-90 days, Red badge indicates <30 days.
5. Customer Udhaar Ledger (Business/Enterprise): Go to Parties > Customer Ledger. Select customer, click 'Add Payment' or send WhatsApp ledger summary.
6. Offline Billing: Billing never stops even if internet disconnects! Bills queue in local outbox and auto-sync silently when internet returns.
7. Human Support: If user explicitly asks to talk to human support or team, reassure them politely and confirm that their inquiry is submitted directly to the live server support desk!
`;

  const systemInstructionMaster = `
You are 'MBI Master Fleet Copilot', the advanced technical governance assistant for Master Fleet Administrators inside the protected '/server' Hub.

Your capabilities include:
1. Fleet Telemetry & Multi-Tenant Management: Explaining how tenant records are isolated in MariaDB (mbi_tenants, mbi_users) with strict WHERE tenant_id clauses.
2. Hardware HWID Reset & Disaster Recovery: When a client laptop is damaged/stolen, explain the [Reset Bound HWID] procedure (/api/master/license/reset-hwid) and how entering the License Key on a new computer binds the new HWID and triggers 1-click restore from their latest 12:00 AM midnight backup snapshot with zero data loss.
3. MariaDB Database Initialization & Diagnostics: Health checks on mbi72dn tables (mbi_medicines, mbi_invoices, mbi_audit_logs, mbi_settings).
4. 173-Switchboard Controls: Explaining how master feature overrides dynamically enable/disable modules per tenant in mbi_settings.
5. Stealth Shadow Mode: Explaining silent tenant impersonation for customer support without credential modification.

Security & Professional Tone:
- Tone: Highly technical, precise, concise, and security-first.
- Respond in professional English (or Roman Urdu if requested).
`;

  const systemInstruction = (context === 'master' as any || context === 'server' as any)
    ? systemInstructionMaster
    : (context === 'home' ? systemInstructionHome : systemInstructionUser);

  // Try each key in the pool with automatic failover
  for (let attempt = 0; attempt < keyPool.length; attempt++) {
    const activeKey = keyPool[currentKeyIndex % keyPool.length];
    const stat = getOrInitKeyStat(activeKey);

    try {
      const ai = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const contents = [
        ...history.map(h => ({
          role: h.role,
          parts: h.parts
        })),
        { role: 'user', parts: [{ text: prompt }] }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        // @ts-ignore
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          topP: 0.9
        }
      });

      const responseText = response.text || 'Shukriya! MBI AI Guide aapki khidmat ke liye tayyar hai. Koyi aur sawal ho to zaroor poochein!';

      // Update key health stats
      stat.status = 'Healthy';
      stat.requestsCount++;
      stat.lastUsed = new Date().toLocaleTimeString();
      stat.lastError = undefined;

      // Advance key index for fair distribution
      const usedIndex = currentKeyIndex % keyPool.length;
      currentKeyIndex = (currentKeyIndex + 1) % keyPool.length;

      return {
        text: responseText,
        humanLeadTriggered: isHumanRequested,
        keyIndexUsed: usedIndex
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted');

      stat.status = isRateLimit ? 'Rate-Limited' : 'Error';
      stat.errorCount++;
      stat.lastError = errMsg;

      console.warn(`[AI KEY ROTATION] Key index ${currentKeyIndex % keyPool.length} failed (${stat.status}). Auto-switching to next key... Error:`, errMsg);
      currentKeyIndex = (currentKeyIndex + 1) % keyPool.length;
    }
  }

  // If all keys fail, return a helpful fallback message
  return {
    text: `MBI AI Guide Filhal high traffic ki waja se update ho raha hai. Aap MBI INVENTRA ke sabhi features (POS Billing, Inventory, Ledgers) ko Normal User Workspace se aaram se istemal kar sakte hain! Support team se baat karne ke liye 'Connect with Team' button par click karein.`,
    humanLeadTriggered: isHumanRequested,
    keyIndexUsed: -1
  };
}

export function getAiConfigStatus() {
  const settings = loadSettings();
  const pool = getKeyPool();

  const keyHealthMetrics: KeyHealthMetric[] = pool.map(k => getOrInitKeyStat(k));

  return {
    isAiEnabledGlobally: settings.isAiEnabledGlobally,
    allowedPlans: settings.allowedPlans,
    homePageEnabled: settings.homePageEnabled,
    autoGreeting: settings.autoGreeting,
    humanSupportNumber: settings.humanSupportNumber,
    keyCount: pool.length,
    activeKeyIndex: currentKeyIndex % pool.length,
    keyHealthMetrics
  };
}
