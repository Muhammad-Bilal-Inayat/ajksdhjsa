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
        humanSupportNumber: data.humanSupportNumber || '+923281302636'
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
    humanSupportNumber: '+923281302636'
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
You are 'MBI AI Guide', the smart official multilingual sales & product assistant for MBI INVENTRA — Pakistan's #1 Enterprise Pharmacy POS & ERP Software.
Your scope is STRICTLY dedicated to Home & Landing Page visitors: explaining software capabilities, lifetime pricing, 10-day free trial, WhatsApp demo, 0.2s POS speed, and 100% offline desktop features.

Key Guidelines:
- Language: You understand and fluently respond in ANY language the user writes in (Urdu, Roman Urdu e.g. "ye software kaisa hai", "mujhe isky bary me batao", "rate kya hain", English, Hindi, Pashto, Punjabi, etc.). Always match the exact language and dialect of the user!
- Tone: Welcoming, enthusiastic, highly knowledgeable, professional, and clear.
- Core Selling Points:
  1. ⚡ 0.2-Second POS Billing: Ultra-fast medicine search & barcode scanning, instant 80mm/58mm thermal receipts.
  2. 🌐 100% Offline Desktop Engine: Runs completely without internet using local database cache; auto-syncs to cloud when connected.
  3. ⏰ FEFO Smart Expiry Radar: Automatically dispenses earliest-expiry batches first to eliminate medicine waste and save 18-22% margins.
  4. 📒 Double-Entry Ledgers & Udhaar: Customer & supplier khatas with 1-click WhatsApp PDF statements.
  5. 💊 Smart Generic Salt Search: Instantly recommend alternative medicine brands with equivalent active ingredients.
- Official Transparent Website Pricing Plans:
  - 🥈 **Silver Basic:**
    • Monthly: **Rs. 1,999 / Month**
    • 1-Year (Annual Deal): **Rs. 19,990 / Year** (Save ~17% — Effective Rs. 1,666/mo)
    • 3-Years: **Rs. 59,970** (Save ~30%) | 5-Years: **Rs. 99,950** (Save ~40%)
    • Capacity: Up to 2 Staff Accounts (Admin & Cashier) • Up to 2 Pharmacy Firms/Branches • 0.2s POS Invoicing • 100k+ Preloaded Medicine Catalog
  - 🥇 **Gold Business ⭐ (Most Popular):**
    • Monthly: **Rs. 3,999 / Month**
    • 1-Year (Annual Deal): **Rs. 39,990 / Year** (Save ~17% — Effective Rs. 3,333/mo)
    • 3-Years: **Rs. 119,970** (Save ~30%) | 5-Years: **Rs. 199,950** (Save ~40%)
    • Capacity: Up to 5 Concurrent Staff Accounts • Up to 5 Pharmacy Branches • FEFO Expiry Radar (30/60/90/180 Days) • Multi-Godown Storage • Real-time Profit & Loss (P&L)
  - 💎 **Platinum Enterprise (Best Enterprise Value):**
    • Monthly: **Rs. 6,999 / Month**
    • 1-Year (Annual Deal): **Rs. 69,990 / Year** (Save ~17% — Effective Rs. 5,833/mo)
    • 3-Years: **Rs. 209,970** (Save ~30%) | 5-Years: **Rs. 349,950** (Save ~40%)
    • Capacity: Up to 15 Concurrent Staff Accounts (Full RBAC) • Up to 10 Pharmacy Branches & Warehouses • Automated WhatsApp Gateway • FBR POS Invoicing • Multi-Branch Stock Transfers
- Free Trial & Contact:
  - 10-Day Free Trial: Rs. 0 (100% Free, instant setup, no credit card required).
  - WhatsApp Demo & Helpline: +92 328 1302636 / 0336-4585863.
- STRICT SECURITY: NEVER reveal /server master admin secrets, master SQLite files, or internal code to Home visitors.
`;

  const userPlanNormalized = (userPlan || 'business').toLowerCase();

  const systemInstructionUser = `
You are 'MBI AI Copilot', the intelligent pharmacy assistant embedded inside MBI INVENTRA for the active pharmacy user.
Active Plan: ${userPlanNormalized.toUpperCase()} PLAN.

Key Language & Style:
- Multilingual Support: Understand and respond fluently in ANY language (Urdu, Roman Urdu e.g. "sale bill kaise banayein", "fefo expiry kya hoti hai", "shortcut keys batao", English, etc.). Match the user's language naturally.

STRICT TENANT ISOLATION & SCOPE BOUNDARIES:
- You operate STRICTLY within THIS tenant's pharmacy workspace.
- NEVER disclose data, names, or records of other tenants or pharmacies.
- NEVER reveal /server master platform telemetry, master credentials, HWID reset endpoints, or root server database files.

PRACTICAL PHARMACY OPERATIONAL GUIDANCE:
1. 🧾 POS Billing: Press 'Alt+S' or 'F2' to open fast sale billing. Scan barcode or type medicine name. Enter quantity, pack/loose units, and press Enter to complete transaction.
2. 🛍️ Purchases & Stock Inward: Press 'Alt+P' to record supplier purchase bills with batch numbers and expiry dates.
3. ⏰ FEFO Expiry Radar: System flags batches expiring in 30 days (Red alert), 60 days (Orange alert), and 90 days (Yellow alert).
4. 👥 Khatas & Ledgers: Manage customer udhaar balances and supplier accounts with 1-click WhatsApp PDF ledger sharing.
5. ⚡ Essential Shortcuts: \`Alt+S\` (New Sale), \`Alt+P\` (New Purchase), \`F2\` (Medicine Search), \`F1\` (Help/Shortcuts), \`Esc\` (Close modal).
6. 💊 Generic Equivalents: Provide accurate generic salt formulas and Pakistani market alternatives (e.g. Augmentin = Curam/Klavox/Amoxi-Clav).
7. 🛡️ Offline Mode: Invoices are saved locally in 0ms and auto-synced once internet is restored.
8. 📞 Live Support: If user asks for human assistance, confirm that their request has been prioritized for the Live Support Desk!
`;

  const systemInstructionMaster = `
You are 'MBI Master Fleet Copilot', the advanced technical assistant for Super Administrators inside the '/server' Master Hub.

Capabilities & Master Scope:
1. 🏢 Multi-Tenant SQLite Vaults: Physical database isolation (server/data/tenants/tenant_[id].sqlite) and Master Hub (master_hub.sqlite).
2. 🛡️ Hardware HWID Reset & Disaster Recovery: Explaining [Reset Bound HWID] (/api/master/license/reset-hwid) to bind a new PC and restore the latest 12:00 AM midnight backup snapshot.
3. 💾 Automated Backups: Daily 12:00 AM midnight per-tenant encrypted backups and instant disaster recovery.
4. ⚙️ 173-Switchboard Feature Toggles: Dynamic runtime module provisioning and plan limits.
5. 📊 Server Telemetry: System health, real-time sync connections, active tenant sessions, and MariaDB/SQLite vault status.

Tone: Highly technical, precise, concise, and security-first. Supports English, Urdu, and Roman Urdu.
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

      const generatePromise = ai.models.generateContent({
        model: 'gemini-flash-latest',
        // @ts-ignore
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          topP: 0.9
        }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI Key request timeout (2500ms)')), 2500)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]) as any;

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

  // If GenAI keys are rate-limited or offline, generate intelligent scoped multilingual response
  const fallbackText = generateIntelligentFallback(prompt, (context === 'master' as any || context === 'server' as any) ? 'server' : (context === 'home' ? 'home' : 'user'), userPlanNormalized);

  return {
    text: fallbackText,
    humanLeadTriggered: isHumanRequested,
    keyIndexUsed: -1
  };
}

function generateIntelligentFallback(query: string, currentContext: 'home' | 'user' | 'server', currentPlan: string = 'business'): string {
  const lower = query.toLowerCase();

  // 1. Human support intent
  if (
    lower.includes('human') || lower.includes('support') || lower.includes('admin') || 
    lower.includes('call') || lower.includes('bilal') || lower.includes('phone') || 
    lower.includes('help') || lower.includes('contact') || lower.includes('rabta') || 
    lower.includes('baat karni') || lower.includes('number') || lower.includes('whatsapp') ||
    query.includes('رابطہ') || query.includes('مدد') || query.includes('نمبر')
  ) {
    return `📞 **MBI Live Human Support Dispatch**\n\nMaine aapki inquiry priority desk par forward kar di hai. Aap hamari 24/7 helpline par direct rabta kar sakte hain:\n- **WhatsApp Support:** +92 328 1302636\n- **Direct Hotline:** 0336-4585863\n\nRepresentative jald aapse rabta karega!`;
  }

  // 2. SERVER CONTEXT (Super Admin Master Fleet Governance)
  if (currentContext === 'server') {
    if (lower.includes('hwid') || lower.includes('reset') || lower.includes('license') || lower.includes('device') || lower.includes('laptop')) {
      return `🛡️ **Master HWID Device Reset & Disaster Recovery Protocol**\n\n- **1-Click Reset:** Super Admin master panel se tenant ke liye \`[Reset Bound HWID]\` trigger karein (\`/api/master/license/reset-hwid\`).\n- **New Computer Binding:** Client jab naye PC par License Key activate karega, system automatically naya Hardware Fingerprint bind kar dega.\n- **Zero Data Loss Restore:** Client ka latest **12:00 AM Midnight Backup Snapshot** naye system par 1-click se restore ho jata hai!`;
    }

    if (lower.includes('backup') || lower.includes('midnight') || lower.includes('12:00') || lower.includes('disaster') || lower.includes('recovery')) {
      return `💾 **Automated 12:00 AM Midnight Encrypted Vault Backups**\n\n- **Zero Downtime Snapshots:** Har tenant ka private SQLite Vault (\`tenant_[id].sqlite\`) rozana raat 12:00 baje encrypted atomic snapshot generate karta hai.\n- **SHA-256 Checksum Verification:** Backup integrity test hoti hai taake file corrupt na ho.\n- **Multi-Tenant Protection:** Ek tenant ka backup dosray tenant se 100% physically isolated rehta hai.`;
    }

    if (lower.includes('tenant') || lower.includes('sqlite') || lower.includes('vault') || lower.includes('isolation') || lower.includes('multi')) {
      return `🏢 **Tenant-Isolated SQLite Vault Architecture**\n\n- **Physical Isolation:** Har pharmacy ka private database \`server/data/tenants/tenant_[id].sqlite\` mein rehta hai. Cross-tenant leakage ka koi chance nahi.\n- **Master Hub Database:** \`server/data/master/master_hub.sqlite\` global licensing, tenant provisioning, aur feature entitlement control karta hai.\n- **High-Speed WAL Mode:** 0ms latency per-transaction speed with native SQLite transactions.`;
    }

    if (lower.includes('switchboard') || lower.includes('173') || lower.includes('feature') || lower.includes('toggle')) {
      return `⚙️ **173-Switchboard Dynamic Master Controls**\n\n- **Real-Time Module Provisioning:** Master Admin se kisi bhi tenant ke modules (Shift Management, Cloud Sync, Multi-Branch, AI Assistant) toggle kiye ja sakte hain.\n- **Instant Sync:** Tenant workstation restart kiye baghair instantly nayi permissions receive karta hai.`;
    }

    return `🛡️ **MBI Master Fleet Copilot Active**\n\nAap Master Server Admin ke hawalay se koi bhi sawal pooch sakte hain:\n- **HWID Reset & Disaster Recovery**\n- **12:00 AM Automated Midnight Backups**\n- **Tenant-Isolated SQLite Vaults**\n- **173-Switchboard Feature Toggles**\n\nTechnical assistance ke liye Master Helpline: **+92 328 1302636**.`;
  }

  // 3. HOME CONTEXT (Visitors & Landing Page)
  if (currentContext === 'home') {
    // Pricing & Plans
    if (
      lower.includes('price') || lower.includes('cost') || lower.includes('rate') || 
      lower.includes('plan') || lower.includes('kitne') || lower.includes('package') || 
      lower.includes('lifetime') || lower.includes('fees') || lower.includes('kharid') ||
      lower.includes('buy') || query.includes('قیمت') || query.includes('پیکیج')
    ) {
      return `💳 **MBI INVENTRA — Transparent Official Pricing & Plans**\n\n- 🥈 **Silver Basic:**\n  • **Monthly:** Rs. 1,999 /mo\n  • **1-Year (Annual):** Rs. 19,990 /yr *(Save ~17% — Eff: Rs. 1,666/mo)*\n  • **3-Years:** Rs. 59,970 | **5-Years:** Rs. 99,950\n  • *Includes: 2 Staff Accounts • 2 Branches • 0.2s POS • 100k+ Preloaded Catalog*\n\n- 🥇 **Gold Business ⭐ (Most Popular):**\n  • **Monthly:** Rs. 3,999 /mo\n  • **1-Year (Annual):** Rs. 39,990 /yr *(Save ~17% — Eff: Rs. 3,333/mo)*\n  • **3-Years:** Rs. 119,970 | **5-Years:** Rs. 199,950\n  • *Includes: 5 Staff Accounts • 5 Branches • FEFO Expiry Radar • Multi-Godown • P&L Analytics*\n\n- 💎 **Platinum Enterprise (Best Enterprise Value):**\n  • **Monthly:** Rs. 6,999 /mo\n  • **1-Year (Annual):** Rs. 69,990 /yr *(Save ~17% — Eff: Rs. 5,833/mo)*\n  • **3-Years:** Rs. 209,970 | **5-Years:** Rs. 349,950\n  • *Includes: 15 Staff Accounts • 10 Branches • Auto WhatsApp Gateway • FBR POS • Multi-Branch*\n\n📞 *Note: Custom multi-branch or dedicated lifetime/on-premise licenses ke liye Master Support (+92 328 1302636) par rabta karein.*\n\n🎁 **10-Day Free Trial Available:** Start today with Rs. 0!`;
    }

    // Free Trial & Demo
    if (lower.includes('trial') || lower.includes('free') || lower.includes('demo') || lower.includes('register') || lower.includes('start') || query.includes('ٹرائل') || query.includes('ڈیمو')) {
      return `🎉 **10-Day 100% Free Trial (Instant Access)**\n\n- **Zero Cost:** Rs. 0 required, koi credit card nahi chahiye.\n- **Instant Setup:** Sirf apna Pharmacy Name aur WhatsApp number darj karein aur turant POS billing shuru karein.\n- **WhatsApp Video Demo:** Live video dekhne ke liye WhatsApp karein: **+92 328 1302636**.`;
    }

    // POS Speed & Offline capabilities
    if (lower.includes('speed') || lower.includes('fast') || lower.includes('offline') || lower.includes('internet') || lower.includes('desktop') || lower.includes('0.2') || query.includes('آف لائن') || query.includes('تیز')) {
      return `⚡ **0.2-Second POS Speed & 100% Offline PC Billing**\n\n- **0.2s Transaction Speed:** Rush hours mein customer ka bill palke jhapakte hi print ho jata hai (\`Alt+S\` / \`F2\`).\n- **100% Offline Mode:** Internet disconnect hone par bhi billing, barcode scanning aur printing 0ms speed se chalti rehti hai.\n- **Auto Cloud Synapse:** Internet aatay hi tamam invoices automatically secure cloud par sync ho jati hain.`;
    }

    // FEFO Expiry
    if (lower.includes('fefo') || lower.includes('expiry') || lower.includes('radar') || lower.includes('nuqsan') || lower.includes('expire') || query.includes('ایکسپائری')) {
      return `⏰ **FEFO (First-Expiry First-Out) Smart Profit Radar**\n\n- **Zero Medicine Waste:** Billing ke waqt system sab se pehle expire hone wala batch auto-deduct karta hai.\n- **30/60/90 Days Color Alerts:** Expire hone se pehle distributors ko medicine wapas bhej kar 18-22% profit margin bachayein.\n- **Expiry Loss Eliminator:** Pharmacy ka hazaron rupay ka nuqsan hamesha ke liye khatam!`;
    }

    // Software Overview / What Can You Do / Introduction (Multilingual Roman Urdu / Urdu / English)
    return `✨ **Assalam-o-Alaikum! Main MBI INVENTRA AI Copilot hoon.**\n\nMain MBI INVENTRA Enterprise Pharmacy POS & ERP Software ke baare mein aapki mukammal rehnumai kar sakta hoon:\n\n1. ⚡ **0.2s Ultra-Fast POS Billing:** Barcode scanning aur 80mm/58mm thermal receipts (\`Alt+S\` / \`F2\`).\n2. 🌐 **100% Offline Engine:** Internet ke baghair continuous billing aur 0ms local response.\n3. ⏰ **FEFO Smart Expiry Radar:** 30/60/90/180 days batch expiry alerts taake expiry loss khatam ho.\n4. 📒 **Customer & Supplier Khatas:** Udhaar aur vasooli ka hisab 1-click WhatsApp PDF receipts ke sath.\n5. 💊 **100k+ Preloaded Medicine Catalog:** Generic salt formulas aur Pakistani brand alternatives.\n6. 💳 **Flexible Pricing Plans:** Basic Rs 1,999/mo | Business Rs 3,999/mo | Enterprise Rs 6,999/mo.\n\nAbhi **Start Free 10-Day Trial** par click karein ya WhatsApp karein: **+92 328 1302636**!`;
  }

  // 4. USER CONTEXT (Active Pharmacy Workspace)
  // POS Shortcuts & Billing
  if (lower.includes('shortcut') || lower.includes('f1') || lower.includes('f2') || lower.includes('pos') || lower.includes('keyboard') || lower.includes('bill') || lower.includes('sale') || query.includes('شارٹ کٹ') || query.includes('بل')) {
    return `⚡ **Essential MBI POS Fast Billing Shortcuts**\n\n- \`Alt + S\` : Open New Sale Invoice instantly\n- \`Alt + P\` : Open New Purchase Bill Inward\n- \`F2\` / \`Tab\` : Focus Instant Medicine & Barcode Search\n- \`F1\` : Open Keyboard Shortcuts Master Guide\n- \`Enter\` : Rapid Line-Item Addition\n- \`Esc\` : Minimize or Close Active Transaction Dock\n\n*Engineered for high-volume rush hours with 0.2s transaction speed.*`;
  }

  // FEFO Expiry Radar
  if (lower.includes('fefo') || lower.includes('expiry') || lower.includes('radar') || lower.includes('waste') || lower.includes('near expiry') || query.includes('ایکسپائری')) {
    return `⏰ **FEFO (First-Expiry, First-Out) Smart Profit Radar**\n\n- **Automated POS Dispensing:** System prioritizes batches closest to expiry date during retail sale billing.\n- **30/60/90-Day Warning Horizon:** Automated radar tags stock approaching expiration for timely return to medicine distributors.\n- **Profit Protection:** Eliminates dead inventory dump write-offs and protects 18-22% net retail margin.`;
  }

  // Khatas & Ledgers
  if (lower.includes('khata') || lower.includes('udhaar') || lower.includes('ledger') || lower.includes('customer') || lower.includes('supplier') || query.includes('کھاتہ') || query.includes('ادھار')) {
    return `📒 **Customer & Supplier Double-Entry Ledgers**\n\n- **Customer Khata:** Sale bill banatay waqt customer select karein, balance due ledger me auto-record ho jayega.\n- **Payment In/Out:** Cash vasooli ya supplier payment **Bank & Cash** module se 1 click mein enter karein.\n- **WhatsApp Statement:** Customer ko unka ledger hisab WhatsApp par PDF receipt ke tor par send karein.`;
  }

  // Shortage Register
  if (lower.includes('shortage') || lower.includes('short') || lower.includes('reorder') || lower.includes('stock') || query.includes('شارٹیج')) {
    return `⚠️ **Smart Shortage Register & Auto Reordering**\n\n- **Customer Demands:** Jo medicine stock mein na ho, cashier foran Shortage Register mein add kar sakta hai.\n- **Purchase Order Auto-Fill:** Supplier purchase order banatay waqt shortage items automatically list mein shamil ho jatay hain.`;
  }

  // Staff PINs & Shift Closing
  if (lower.includes('staff') || lower.includes('pin') || lower.includes('shift') || lower.includes('drawer') || lower.includes('cashier')) {
    return `🔐 **Staff PINs & Cashier Shift Closing**\n\n- **4-Digit Staff PIN:** Har cashier ko private PIN dein taake unauthorized discounts ya deletions block hon.\n- **Shift Float Reconciliation:** Day-end par drawer cash count match karein aur shift summary report print karein.`;
  }

  // General user workspace fallback in Urdu / Roman Urdu / English
  return `✨ **MBI AI Copilot Response**\n\nMain aapke Pharmacy Workspace ka intelligent AI guide hoon:\n\n- **Fast POS Billing:** \`Alt+S\` dabayein ya \`F2\` se medicine search karein.\n- **FEFO Expiry Alert:** Menu se FEFO Radar check karke near-expiry stock distributors ko return karein.\n- **Customer Ledgers:** Parties menu mein udhaar aur vasooli maintain karein.\n\nAgar kisi specific feature ya generic medicine ke baray mein janna chahein to zaroor poochein!`;
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
