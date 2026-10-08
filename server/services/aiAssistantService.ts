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
const ARCHIVED_SESSIONS_FILE = path.resolve(process.cwd(), '.ai_chat_sessions_archived.json');

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

export function deleteKeyStat(key: string) {
  delete keyHealthStats[key];
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
// LIVE TWO-WAY CHAT SESSIONS & AUTO-ARCHIVE ENGINE (7-Day / 20-Session Threshold)
// ----------------------------------------------------
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ACTIVE_SESSIONS = 20;

function loadArchivedChatSessions(): ChatSession[] {
  try {
    if (fs.existsSync(ARCHIVED_SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(ARCHIVED_SESSIONS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading archived AI chat sessions:', err);
  }
  return [];
}

function saveArchivedChatSessions(archived: ChatSession[]) {
  try {
    fs.writeFileSync(ARCHIVED_SESSIONS_FILE, JSON.stringify(archived, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving archived AI chat sessions:', err);
  }
}

export function autoArchiveSessions(): { active: ChatSession[]; archived: ChatSession[] } {
  let activeSessions = loadChatSessionsRaw();
  let archivedSessions = loadArchivedChatSessions();

  const now = Date.now();
  const toKeep: ChatSession[] = [];
  const toArchive: ChatSession[] = [];

  // 1. Separate sessions older than 7 days
  for (const sess of activeSessions) {
    const sessionTime = new Date(sess.lastMessageAt || sess.updatedAt || sess.createdAt).getTime();
    if (now - sessionTime > SEVEN_DAYS_MS) {
      toArchive.push(sess);
    } else {
      toKeep.push(sess);
    }
  }

  // 2. Enforce 20-session active cap (keep most recent 20, archive older ones to eliminate server DOM/memory load)
  toKeep.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
  
  if (toKeep.length > MAX_ACTIVE_SESSIONS) {
    const excess = toKeep.splice(MAX_ACTIVE_SESSIONS);
    toArchive.push(...excess);
  }

  if (toArchive.length > 0) {
    // Merge into archived sessions avoiding duplicate IDs
    const existingArchivedIds = new Set(archivedSessions.map(s => s.id));
    for (const item of toArchive) {
      if (!existingArchivedIds.has(item.id)) {
        archivedSessions.unshift(item);
        existingArchivedIds.add(item.id);
      }
    }
    saveChatSessionsRaw(toKeep);
    saveArchivedChatSessions(archivedSessions);
  }

  return { active: toKeep, archived: archivedSessions };
}

function loadChatSessionsRaw(): ChatSession[] {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading AI chat sessions:', err);
  }
  return [];
}

function saveChatSessionsRaw(sessions: ChatSession[]) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving AI chat sessions:', err);
  }
}

function loadChatSessions(): ChatSession[] {
  const { active } = autoArchiveSessions();
  return active;
}

function saveChatSessions(sessions: ChatSession[]) {
  saveChatSessionsRaw(sessions);
}

export function getArchivedChatSessions(): ChatSession[] {
  return loadArchivedChatSessions();
}

export function archiveSession(sessionId: string): boolean {
  const active = loadChatSessionsRaw();
  const target = active.find(s => s.id === sessionId);
  if (!target) return false;

  const remaining = active.filter(s => s.id !== sessionId);
  const archived = loadArchivedChatSessions();
  if (!archived.some(s => s.id === sessionId)) {
    archived.unshift(target);
    saveArchivedChatSessions(archived);
  }
  saveChatSessionsRaw(remaining);
  return true;
}

export function unarchiveSession(sessionId: string): boolean {
  const archived = loadArchivedChatSessions();
  const target = archived.find(s => s.id === sessionId);
  if (!target) return false;

  const remainingArchived = archived.filter(s => s.id !== sessionId);
  const active = loadChatSessionsRaw();
  if (!active.some(s => s.id === sessionId)) {
    active.unshift(target);
    saveChatSessionsRaw(active);
  }
  saveArchivedChatSessions(remainingArchived);
  return true;
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
  const found = sessions.find(s => s.id === sessionId);
  if (found) return found;
  const archived = loadArchivedChatSessions();
  return archived.find(s => s.id === sessionId) || null;
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

export async function addCustomApiKey(newKey: string): Promise<{ success: boolean; message: string; keyHealth: KeyHealthMetric[] }> {
  const trimmed = newKey.trim();
  if (!trimmed || trimmed.length < 10) {
    throw new Error('Invalid API Key provided. Must be at least 10 characters.');
  }

  const settings = loadSettings();
  if (settings.customKeys.includes(trimmed)) {
    throw new Error('This API key is already registered in the rotation pool.');
  }

  // Pre-flight test key
  const testRes = await testSingleKey(trimmed);

  const updatedKeys = [...settings.customKeys, trimmed];
  saveSettings({ customKeys: updatedKeys });

  const status = getAiConfigStatus();
  return {
    success: true,
    message: testRes.success ? 'New API key verified & added to rotation pool!' : `API key added (Warning: ${testRes.message})`,
    keyHealth: status.keyHealthMetrics
  };
}

export function removeCustomApiKey(keyToRemove: string): { success: boolean; message: string; keyHealth: KeyHealthMetric[] } {
  const trimmed = keyToRemove.trim();
  const settings = loadSettings();
  
  if (!settings.customKeys.includes(trimmed)) {
    // Check if it matches masked key or slot
    const found = settings.customKeys.find(k => k === trimmed || `${k.substring(0, 10)}...${k.substring(k.length - 6)}` === trimmed);
    if (!found) {
      throw new Error('Key not found in custom keys list.');
    }
    keyToRemove = found;
  }

  const updatedKeys = settings.customKeys.filter(k => k !== keyToRemove);
  deleteKeyStat(keyToRemove);
  saveSettings({ customKeys: updatedKeys });

  const status = getAiConfigStatus();
  return {
    success: true,
    message: 'API key successfully removed from rotation pool.',
    keyHealth: status.keyHealthMetrics
  };
}

/**
 * Execute Gemini API with automatic key rotation, tenant live data injection, and failover
 */
export async function generateAiResponse(
  prompt: string,
  context: 'home' | 'user' | 'store' | 'checkout' | 'server' = 'user',
  userPlan: string = 'business',
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [],
  tenantOptions?: {
    tenantId?: string;
    storeName?: string;
    userName?: string;
    userEmail?: string;
    phone?: string;
  }
): Promise<{ text: string; humanLeadTriggered: boolean; keyIndexUsed: number }> {
  const settings = loadSettings();

  // Check global toggle
  if (!settings.isAiEnabledGlobally) {
    throw new Error('MBI AI Assistant is currently disabled globally by Server Master.');
  }

  const tenantId = tenantOptions?.tenantId || 'default';
  const storeName = tenantOptions?.storeName || 'My Pharmacy';
  const userName = tenantOptions?.userName || 'User';

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

    // Check daily quota limit
    if (tenantId && tenantId !== 'default' && tenantId !== 'global') {
      const quotaLimits = getTenantAiQuotaLimits(tenantId, userPlan);
      const usedToday = getTenantTodayUsed(tenantId);
      if (usedToday >= quotaLimits.effectiveLimit) {
        return {
          text: `⚠️ **Daily AI Message Quota Reached (${usedToday}/${quotaLimits.effectiveLimit} msgs)**\n\nAapki pharmacy ka aaj ka daily AI limit (${quotaLimits.effectiveLimit} messages/day) mukammal ho chuka hai. Agar aapko mazeed limit chahiye, to Master Administrator se rabta karein ya kal dobara use karein.`,
          humanLeadTriggered: false,
          keyIndexUsed: 0
        };
      }
      incrementTenantDailyUsage(tenantId, {
        storeName,
        name: userName,
        plan: userPlan,
        targetType: 'tenant'
      });
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
  if (genericMatch && context !== 'server') {
    return {
      text: genericMatch,
      humanLeadTriggered: false,
      keyIndexUsed: 0
    };
  }

  // 3. Fetch Tenant Live Data Snapshot if in User Workspace (Strictly Isolated to this tenantId)
  let tenantSnapshot: any = null;
  if (context === 'user' && tenantId && tenantId !== 'default' && tenantId !== 'global') {
    try {
      const { getTenantLiveSnapshot } = await import('../controllers/aiDataQueryEngine');
      tenantSnapshot = await getTenantLiveSnapshot(tenantId);
    } catch (e) {
      console.warn('[AI TENANT SNAPSHOT FETCH WARN]', e);
    }
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

  // ─────────────────────────────────────────────────────────────
  // 1. HOME & LANDING PAGE VISITORS AI SYSTEM PROMPT
  // ─────────────────────────────────────────────────────────────
  const systemInstructionHome = `
You are 'MBI AI Guide', the smart official multilingual sales & product assistant for MBI INVENTRA — Pakistan's #1 Enterprise Pharmacy POS & ERP Software.
Your scope is STRICTLY dedicated to Home & Landing Page visitors: explaining software capabilities, transparent pricing, 10-day free trial, WhatsApp demo, 0.2s POS speed, and 100% offline desktop features.

Key Guidelines:
- Language: You understand and fluently respond in ANY language the user writes in (Urdu, Roman Urdu e.g. "ye software kaisa hai", "mujhe isky bary me batao", "rate kya hain", English, Hindi, Pashto, Punjabi, etc.). Always match the exact language and dialect of the user!
- Greetings & Custom Conversational Messages:
  - If the user says "hi", "hello", "salam", "hey", "kaisay ho", or any casual greeting, greet them warmly and concisely in their language and immediately introduce what you can do for them:
    e.g. "Assalam-o-Alaikum! Main MBI INVENTRA ka AI Guide hoon. Main aapko hamaray 0.2s POS Billing Software, 10-Day Free Trial, FEFO Expiry Radar, aur Pricing Plans ke baray mein mukammal rehnumai de sakta hoon. Aap kis cheez ke baray mein janna chahtay hain?"
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
    • 3-Years: **Rs. 59,970** | 5-Years: **Rs. 99,950**
    • Capacity: Up to 2 Staff Accounts • Up to 2 Pharmacy Firms/Branches • 0.2s POS Invoicing • 100k+ Preloaded Medicine Catalog
  - 🥇 **Gold Business ⭐ (Most Popular):**
    • Monthly: **Rs. 3,999 / Month**
    • 1-Year (Annual Deal): **Rs. 39,990 / Year** (Save ~17% — Effective Rs. 3,333/mo)
    • 3-Years: **Rs. 119,970** | 5-Years: **Rs. 199,950**
    • Capacity: Up to 5 Concurrent Staff Accounts • Up to 5 Pharmacy Branches • FEFO Expiry Radar (30/60/90/180 Days) • Multi-Godown Storage • Real-time Profit & Loss (P&L)
  - 💎 **Platinum Enterprise (Best Enterprise Value):**
    • Monthly: **Rs. 6,999 / Month**
    • 1-Year (Annual Deal): **Rs. 69,990 / Year** (Save ~17% — Effective Rs. 5,833/mo)
    • 3-Years: **Rs. 209,970** | 5-Years: **Rs. 349,950**
    • Capacity: Up to 15 Concurrent Staff Accounts (Full RBAC) • Up to 10 Pharmacy Branches & Warehouses • Automated WhatsApp Gateway • FBR POS Invoicing • Multi-Branch Stock Transfers
- Free Trial & Contact:
  - 10-Day Free Trial: Rs. 0 (100% Free, instant setup, no credit card required).
  - WhatsApp Demo & Helpline: +92 328 1302636 / 0336-4585863.
- STRICT SECURITY: NEVER reveal /server master admin secrets, master SQLite files, or private customer/tenant records to Home visitors.
`;

  const userPlanNormalized = (userPlan || 'business').toLowerCase();

  // Format tenant snapshot summary if available
  let tenantDataBlock = '';
  if (tenantSnapshot) {
    tenantDataBlock = `
===================================================================
[STRICTLY ISOLATED LIVE DATABASE SNAPSHOT FOR THIS PHARMACY ONLY]
Pharmacy Store: ${storeName} (Tenant ID: ${tenantId})
Active User: ${userName} | Plan: ${userPlanNormalized.toUpperCase()}

📊 LIVE FINANCIALS & SALES SUMMARY:
- Today's Invoices: ${tenantSnapshot.todaySalesCount} orders | Today's Revenue: Rs. ${tenantSnapshot.todayRevenue.toLocaleString()}
- Total Lifetime Invoices: ${tenantSnapshot.totalSalesCount} | Total Revenue: Rs. ${tenantSnapshot.totalSalesRevenue.toLocaleString()}
- Today's Expenses: Rs. ${tenantSnapshot.todayExpenses.toLocaleString()} | Total Expenses: Rs. ${tenantSnapshot.totalExpenses.toLocaleString()}

👥 PARTIES, KHATAS & LEDGERS:
- Total Customers: ${tenantSnapshot.totalCustomers} | Total Customer Receivables (Udhaar Due): Rs. ${tenantSnapshot.customerReceivableTotal.toLocaleString()}
- Top Debtors (Customers owing balance): ${tenantSnapshot.topCustomersWithBalance.length > 0 ? tenantSnapshot.topCustomersWithBalance.map((c: any) => `${c.name}: Rs. ${c.balance.toLocaleString()}${c.phone ? ` (${c.phone})` : ''}`).join(', ') : 'None (All customer balances clear)'}
- Total Suppliers: ${tenantSnapshot.totalSuppliers} | Total Supplier Payables (Owed to Distributors): Rs. ${tenantSnapshot.supplierPayableTotal.toLocaleString()}
- Top Creditors (Suppliers to pay): ${tenantSnapshot.topSuppliersWithBalance.length > 0 ? tenantSnapshot.topSuppliersWithBalance.map((s: any) => `${s.name}: Rs. ${s.balance.toLocaleString()}${s.phone ? ` (${s.phone})` : ''}`).join(', ') : 'None (All supplier balances clear)'}

💊 INVENTORY, STOCK & FEFO RADAR:
- Total Medicine Items: ${tenantSnapshot.totalMedicines}
- Low Stock Items Count: ${tenantSnapshot.lowStockCount}
  ${tenantSnapshot.lowStockItems.length > 0 ? `(Low stock list: ${tenantSnapshot.lowStockItems.map((i: any) => `${i.name} [Qty: ${i.stock_qty}, Min: ${i.min_stock}]`).join(', ')})` : ''}
- Near Expiry Items Count (< 90 Days): ${tenantSnapshot.nearExpiryCount}
  ${tenantSnapshot.nearExpiryItems.length > 0 ? `(Near expiry list: ${tenantSnapshot.nearExpiryItems.map((e: any) => `${e.name} [Batch: ${e.batch || 'N/A'}, Expiry: ${e.expiry}, Qty: ${e.qty}]`).join(', ')})` : ''}
===================================================================
`;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. USER WORKSPACE (/user) AI SYSTEM PROMPT
  // ─────────────────────────────────────────────────────────────
  const systemInstructionUser = `
You are 'MBI AI Copilot', the intelligent dedicated pharmacy assistant embedded inside MBI INVENTRA for pharmacy: '${storeName}'.
Active Plan: ${userPlanNormalized.toUpperCase()} PLAN.

${tenantDataBlock}

Key Language & Style:
- Multilingual Support: Understand and respond fluently in ANY language (Urdu, Roman Urdu e.g. "aaj ki sale kitni hai", "khatay ka hisab do", "stock aur expiry batao", "shortcut keys batao", English, etc.). Match the user's language naturally.
- Greetings & Conversational Handling:
  - If the user says "hi", "hello", "salam", "hey", or casual greetings, greet them warmly in their language:
    e.g. "Assalam-o-Alaikum ${userName}! Main aapka MBI INVENTRA Copilot hoon (${storeName}). Main aapko Sale Invoices, Customer & Supplier Khatas, Expiry Radar, Stock Summary aur Reports mein madad kar sakta hoon. Aaj aap kya check karna chahtay hain?"

STRICT TENANT ISOLATION & PRIVACY RULES:
- You operate STRICTLY within THIS pharmacy tenant (${tenantId}).
- NEVER disclose data, names, or records of other tenants or pharmacies under any circumstance.
- If asked about "reports", "today's sale", "customer khata", "supplier balances", "stock", or "profit": use the [LIVE DATABASE SNAPSHOT] provided above to give exact, accurate figures, rupee amounts, and party names!
- NEVER reveal /server master platform telemetry, master credentials, HWID reset endpoints, or root server database files.

PRACTICAL PHARMACY GUIDANCE:
1. 🧾 POS Billing: Press 'Alt+S' or 'F2' to open fast sale billing. Scan barcode or type medicine name.
2. 🛍️ Purchases: Press 'Alt+P' to record supplier purchase bills with batch numbers and expiry dates.
3. ⏰ FEFO Expiry Radar: Flag batches expiring in 30 days (Red), 60 days (Orange), and 90 days (Yellow) so stock is returned to distributors in time.
4. 👥 Khatas & Ledgers: Manage customer udhaar balances and supplier accounts with 1-click WhatsApp PDF ledger sharing.
5. ⚡ Essential Shortcuts: \`Alt+S\` (New Sale), \`Alt+P\` (New Purchase), \`F2\` (Medicine Search), \`F1\` (Help/Shortcuts), \`Esc\` (Close modal).
6. 💊 Generic Equivalents: Provide accurate generic salt formulas and Pakistani market alternatives (e.g. Augmentin = Curam/Klavox/Amoxi-Clav).
7. 📞 Live Support: If user asks for human assistance, confirm that their request has been prioritized for the Live Support Desk!
`;

  // ─────────────────────────────────────────────────────────────
  // 3. MASTER SERVER (/server) AI SYSTEM PROMPT
  // ─────────────────────────────────────────────────────────────
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

  const systemInstruction = (context === 'server')
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

  // If GenAI keys are rate-limited or offline, generate intelligent scoped multilingual response with tenant data
  const fallbackText = generateIntelligentFallback(
    prompt, 
    context === 'server' ? 'server' : (context === 'home' ? 'home' : 'user'), 
    userPlanNormalized,
    tenantSnapshot,
    storeName
  );

  return {
    text: fallbackText,
    humanLeadTriggered: isHumanRequested,
    keyIndexUsed: -1
  };
}

function generateIntelligentFallback(
  query: string, 
  currentContext: 'home' | 'user' | 'server', 
  currentPlan: string = 'business',
  tenantSnapshot?: any,
  storeName?: string
): string {
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

  // 2. Casual greetings & hello / salam
  if (
    lower === 'hi' || lower === 'hello' || lower === 'salam' || lower === 'assalam o alaikum' || 
    lower === 'salam o alaikum' || lower === 'hey' || lower === 'aoa' || lower === 'asalam' ||
    lower.startsWith('hello') || lower.startsWith('salam') || lower.includes('kaisay ho') || lower.includes('kese ho')
  ) {
    if (currentContext === 'server') {
      return `🛡️ **Assalam-o-Alaikum Master Administrator!**\n\nMain MBI Master Fleet Copilot hoon. Main aapko HWID Device Resets, 12:00 AM Encrypted Backups, Tenant SQLite Vaults, aur Server Telemetry mein assist kar sakta hoon.`;
    }
    if (currentContext === 'home') {
      return `✨ **Assalam-o-Alaikum! Welcome to MBI INVENTRA.**\n\nMain MBI INVENTRA ka AI Guide hoon. Main aapko hamaray **0.2s POS Billing Software**, **10-Day Free Trial**, **FEFO Expiry Radar**, aur **Pricing Plans** ke baray mein mukammal rehnumai de sakta hoon.\n\nAap kis cheez ke baray mein janna chahtay hain?`;
    }
    return `✨ **Assalam-o-Alaikum! Main aapka MBI AI Copilot hoon (${storeName || 'Pharmacy'}).**\n\nMain aapki live sales, customer udhaar khatay, supplier payments, stock status, aur reports mein madad ke liye tayyar hoon. Aap mujh se poochein:\n- *"Aaj ki sale kitni hai?"*\n- *"Customer khata summary dikhao"*\n- *"Near expiry ya low stock medicines kaun si hain?"*`;
  }

  // 3. SERVER CONTEXT (Super Admin Master Fleet Governance)
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

  // 4. HOME CONTEXT (Visitors & Landing Page)
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

    // Software Overview / What Can You Do / Introduction
    return `✨ **Assalam-o-Alaikum! Main MBI INVENTRA AI Copilot hoon.**\n\nMain MBI INVENTRA Enterprise Pharmacy POS & ERP Software ke baare mein aapki mukammal rehnumai kar sakta hoon:\n\n1. ⚡ **0.2s Ultra-Fast POS Billing:** Barcode scanning aur 80mm/58mm thermal receipts (\`Alt+S\` / \`F2\`).\n2. 🌐 **100% Offline Engine:** Internet ke baghair continuous billing aur 0ms local response.\n3. ⏰ **FEFO Smart Expiry Radar:** 30/60/90/180 days batch expiry alerts taake expiry loss khatam ho.\n4. 📒 **Customer & Supplier Khatas:** Udhaar aur vasooli ka hisab 1-click WhatsApp PDF receipts ke sath.\n5. 💊 **100k+ Preloaded Medicine Catalog:** Generic salt formulas aur Pakistani brand alternatives.\n6. 💳 **Flexible Pricing Plans:** Basic Rs 1,999/mo | Business Rs 3,999/mo | Enterprise Rs 6,999/mo.\n\nAbhi **Start Free 10-Day Trial** par click karein ya WhatsApp karein: **+92 328 1302636**!`;
  }

  // 5. USER CONTEXT (Active Pharmacy Workspace with Live Data)
  // Real-Time Sales Query
  if (lower.includes('sale') || lower.includes('revenue') || lower.includes('kamai') || lower.includes('aaj ki') || lower.includes('today')) {
    if (tenantSnapshot) {
      return `📊 **Live Sales & Invoices Summary (${storeName || 'My Pharmacy'})**\n\n- **Today's Invoices:** ${tenantSnapshot.todaySalesCount} bills\n- **Today's Total Revenue:** Rs. ${tenantSnapshot.todayRevenue.toLocaleString()}\n- **Total Lifetime Sales:** ${tenantSnapshot.totalSalesCount} invoices (Rs. ${tenantSnapshot.totalSalesRevenue.toLocaleString()})\n\n*💡 Tip: Press \`Alt+S\` to create a new POS sale invoice instantly.*`;
    }
  }

  // Customer & Supplier Khata Query
  if (lower.includes('khata') || lower.includes('udhaar') || lower.includes('customer') || lower.includes('supplier') || lower.includes('party') || lower.includes('parties') || lower.includes('balance') || query.includes('کھاتہ') || query.includes('ادھار')) {
    if (tenantSnapshot) {
      const topCustList = tenantSnapshot.topCustomersWithBalance.length > 0
        ? tenantSnapshot.topCustomersWithBalance.map((c: any) => `• **${c.name}**: Rs. ${c.balance.toLocaleString()}${c.phone ? ` (${c.phone})` : ''}`).join('\n')
        : '• Sabhi customers ka hisab clear hai.';

      const topSuppList = tenantSnapshot.topSuppliersWithBalance.length > 0
        ? tenantSnapshot.topSuppliersWithBalance.map((s: any) => `• **${s.name}**: Rs. ${s.balance.toLocaleString()}${s.phone ? ` (${s.phone})` : ''}`).join('\n')
        : '• Sabhi suppliers ka balance paid hai.';

      return `📒 **Live Parties & Khata Summary (${storeName || 'My Pharmacy'})**\n\n**Customers (Total: ${tenantSnapshot.totalCustomers}):**\n- **Total Udhaar / Receivables:** Rs. ${tenantSnapshot.customerReceivableTotal.toLocaleString()}\n${topCustList}\n\n**Suppliers / Distributors (Total: ${tenantSnapshot.totalSuppliers}):**\n- **Total Payables Due:** Rs. ${tenantSnapshot.supplierPayableTotal.toLocaleString()}\n${topSuppList}\n\n*💡 Statement send karne ke liye Parties menu mein WhatsApp share button use karein.*`;
    }
  }

  // Reports & Business Overview Query
  if (lower.includes('report') || lower.includes('summary') || lower.includes('hisab') || lower.includes('audit') || query.includes('رپورٹ')) {
    if (tenantSnapshot) {
      return `📈 **Live Business Health & Operations Report (${storeName || 'My Pharmacy'})**\n\n- **Today's Sales:** ${tenantSnapshot.todaySalesCount} Invoices | **Rs. ${tenantSnapshot.todayRevenue.toLocaleString()}**\n- **Today's Expenses:** Rs. ${tenantSnapshot.todayExpenses.toLocaleString()}\n- **Customer Udhaar Due:** Rs. ${tenantSnapshot.customerReceivableTotal.toLocaleString()} (${tenantSnapshot.totalCustomers} Customers)\n- **Supplier Payables:** Rs. ${tenantSnapshot.supplierPayableTotal.toLocaleString()} (${tenantSnapshot.totalSuppliers} Suppliers)\n- **Total Stock Catalog:** ${tenantSnapshot.totalMedicines} Medicines\n- **Low Stock Alerts:** ${tenantSnapshot.lowStockCount} items\n- **Near Expiry Alerts (<90 Days):** ${tenantSnapshot.nearExpiryCount} items\n\nMazeed detailed item-wise P&L dekhne ke liye **Reports** menu par click karein.`;
    }
  }

  // Stock, Shortage & Expiry Query
  if (lower.includes('stock') || lower.includes('shortage') || lower.includes('expiry') || lower.includes('fefo') || query.includes('اسٹاک') || query.includes('ایکسپائری')) {
    if (tenantSnapshot) {
      const lowList = tenantSnapshot.lowStockItems.length > 0
        ? tenantSnapshot.lowStockItems.map((i: any) => `• **${i.name}** (Current: ${i.stock_qty}, Min: ${i.min_stock})`).join('\n')
        : '• Koyi critical low stock item nahi.';

      const expList = tenantSnapshot.nearExpiryItems.length > 0
        ? tenantSnapshot.nearExpiryItems.map((e: any) => `• **${e.name}** (Batch: ${e.batch || 'N/A'}, Expiry: ${e.expiry}, Qty: ${e.qty})`).join('\n')
        : '• Next 90 days mein koyi medicine expire nahi ho rahi.';

      return `📦 **Live Inventory & FEFO Expiry Radar (${storeName || 'My Pharmacy'})**\n\n- **Total Catalog Medicines:** ${tenantSnapshot.totalMedicines}\n- **Low Stock Items (${tenantSnapshot.lowStockCount}):**\n${lowList}\n\n- **Near Expiry Stock (${tenantSnapshot.nearExpiryCount} items < 90 Days):**\n${expList}\n\n*💡 FEFO Radar se stock check karke distributors ko return claim bhejain.*`;
    }
  }

  // POS Shortcuts & Billing
  if (lower.includes('shortcut') || lower.includes('f1') || lower.includes('f2') || lower.includes('pos') || lower.includes('keyboard') || lower.includes('bill') || query.includes('شارٹ کٹ') || query.includes('بل')) {
    return `⚡ **Essential MBI POS Fast Billing Shortcuts**\n\n- \`Alt + S\` : Open New Sale Invoice instantly\n- \`Alt + P\` : Open New Purchase Bill Inward\n- \`F2\` / \`Tab\` : Focus Instant Medicine & Barcode Search\n- \`F1\` : Open Keyboard Shortcuts Master Guide\n- \`Enter\` : Rapid Line-Item Addition\n- \`Esc\` : Minimize or Close Active Transaction Dock\n\n*Engineered for high-volume rush hours with 0.2s transaction speed.*`;
  }

  // General user workspace fallback
  return `✨ **MBI AI Copilot Response (${storeName || 'My Pharmacy'})**\n\nMain aapke Pharmacy Workspace ka intelligent AI guide hoon:\n\n- **Today's Sales & Reports:** Sales summary ya financial report poochein.\n- **Customer & Supplier Khatas:** Udhaar hisab aur payables check karein.\n- **FEFO Expiry & Stock:** Near expiry ya low stock status janiye.\n- **Fast POS Shortcuts:** \`Alt+S\` (New Sale), \`F2\` (Medicine Search).\n\nAap kis cheez ke baray mein janna chahtay hain?`;
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

// ----------------------------------------------------
// PERSISTENT PER-TENANT AI QUOTAS & LIMIT OVERRIDES
// ----------------------------------------------------
const QUOTAS_FILE = path.resolve(process.cwd(), '.ai_tenant_quotas.json');

export interface TenantQuotaRecord {
  targetId: string;
  targetType: 'tenant' | 'user';
  name?: string;
  storeName?: string;
  plan: string;
  customLimit: number;
  todayUsed?: number;
  lastUsedDate?: string;
  updatedAt: string;
}

export function loadTenantQuotas(): Record<string, TenantQuotaRecord> {
  try {
    if (fs.existsSync(QUOTAS_FILE)) {
      return JSON.parse(fs.readFileSync(QUOTAS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading tenant AI quotas:', err);
  }
  return {};
}

export function saveTenantQuotas(quotas: Record<string, TenantQuotaRecord>) {
  try {
    fs.writeFileSync(QUOTAS_FILE, JSON.stringify(quotas, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving tenant AI quotas:', err);
  }
}

export function getTenantTodayUsed(targetId: string): number {
  const quotas = loadTenantQuotas();
  const rec = quotas[targetId];
  if (!rec) return 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  if (rec.lastUsedDate !== todayStr) {
    return 0;
  }
  return rec.todayUsed || 0;
}

export function incrementTenantDailyUsage(
  targetId: string, 
  meta?: { name?: string; storeName?: string; plan?: string; targetType?: 'tenant' | 'user' }
): number {
  const quotas = loadTenantQuotas();
  const todayStr = new Date().toISOString().slice(0, 10);
  const existing = quotas[targetId] || {
    targetId,
    targetType: meta?.targetType || 'tenant',
    name: meta?.name || targetId,
    storeName: meta?.storeName || targetId,
    plan: meta?.plan || 'Business',
    customLimit: 0,
    updatedAt: new Date().toISOString()
  };

  if (existing.lastUsedDate !== todayStr) {
    existing.todayUsed = 1;
    existing.lastUsedDate = todayStr;
  } else {
    existing.todayUsed = (existing.todayUsed || 0) + 1;
  }
  if (meta?.storeName) existing.storeName = meta.storeName;
  if (meta?.plan) existing.plan = meta.plan;
  existing.updatedAt = new Date().toISOString();
  quotas[targetId] = existing;
  saveTenantQuotas(quotas);
  return existing.todayUsed;
}

export function resetTenantDailyUsage(targetId: string): TenantQuotaRecord {
  const quotas = loadTenantQuotas();
  const todayStr = new Date().toISOString().slice(0, 10);
  if (quotas[targetId]) {
    quotas[targetId].todayUsed = 0;
    quotas[targetId].lastUsedDate = todayStr;
    quotas[targetId].updatedAt = new Date().toISOString();
  } else {
    quotas[targetId] = {
      targetId,
      targetType: 'tenant',
      name: targetId,
      storeName: targetId,
      plan: 'Basic',
      customLimit: 0,
      todayUsed: 0,
      lastUsedDate: todayStr,
      updatedAt: new Date().toISOString()
    };
  }
  saveTenantQuotas(quotas);
  return quotas[targetId];
}

export function setTenantQuotaOverride(
  targetId: string, 
  customLimit: number, 
  meta?: { name?: string; storeName?: string; plan?: string; targetType?: 'tenant' | 'user' }
) {
  const quotas = loadTenantQuotas();
  const existing: any = quotas[targetId] || {};
  quotas[targetId] = {
    ...existing,
    targetId,
    targetType: meta?.targetType || existing.targetType || 'tenant',
    name: meta?.name || existing.name || targetId,
    storeName: meta?.storeName || existing.storeName || targetId,
    plan: meta?.plan || existing.plan || 'Business',
    customLimit: Number(customLimit),
    updatedAt: new Date().toISOString()
  };
  saveTenantQuotas(quotas);
  return quotas[targetId];
}

export function getTenantAiQuotaLimits(targetId: string, plan: string = 'Basic'): { baseLimit: number; customLimit: number | null; effectiveLimit: number; isOverridden: boolean } {
  const normalized = (plan || 'Basic').toLowerCase();
  let baseLimit = 50; // Basic / Silver: 50 per day
  if (normalized.includes('enterprise') || normalized.includes('platinum')) {
    baseLimit = 300; // Platinum / Enterprise: 300 per day
  } else if (normalized.includes('business') || normalized.includes('gold')) {
    baseLimit = 100; // Business / Gold: 100 per day
  } else if (normalized.includes('home') || normalized.includes('trial') || normalized.includes('guest')) {
    baseLimit = 20; // Home / Guest: 20 per day
  }

  const quotas = loadTenantQuotas();
  const override = quotas[targetId];
  if (override && typeof override.customLimit === 'number' && override.customLimit > 0) {
    return {
      baseLimit,
      customLimit: override.customLimit,
      effectiveLimit: override.customLimit,
      isOverridden: true
    };
  }

  return {
    baseLimit,
    customLimit: null,
    effectiveLimit: baseLimit,
    isOverridden: false
  };
}

export function getAllTenantAiQuotasList() {
  const quotas = loadTenantQuotas();
  const sessions = loadChatSessions();
  const results: any[] = [];
  const seenIds = new Set<string>();

  // 1. Gather from SQLite Master Vault mbi_tenants
  try {
    const { getMasterVault } = require('../db/sqliteVaultManager');
    const masterDb = getMasterVault();
    const tenants: any[] = masterDb.prepare(`SELECT id, tenant_id, name, owner_name, plan, status FROM mbi_tenants`).all();
    if (Array.isArray(tenants)) {
      for (const t of tenants) {
        const id = t.tenant_id || t.id;
        seenIds.add(id);
        const quotaInfo = getTenantAiQuotaLimits(id, t.plan);
        const todayUsed = getTenantTodayUsed(id);
        results.push({
          targetId: id,
          targetType: 'tenant',
          name: t.name || t.owner_name || id,
          storeName: t.name || id,
          ownerName: t.owner_name || 'Store Owner',
          plan: t.plan || 'Basic',
          status: t.status || 'Active',
          baseLimit: quotaInfo.baseLimit,
          customLimit: quotaInfo.customLimit,
          effectiveLimit: quotaInfo.effectiveLimit,
          isOverridden: quotaInfo.isOverridden,
          todayUsed,
          updatedAt: quotas[id]?.updatedAt || null
        });
      }
    }
  } catch (e) {}

  // 2. Add sessions if not already in list
  for (const s of sessions) {
    const id = s.tenantId || s.userId;
    if (id && !seenIds.has(id) && id !== 'default') {
      seenIds.add(id);
      const quotaInfo = getTenantAiQuotaLimits(id, s.plan);
      const todayUsed = getTenantTodayUsed(id);
      results.push({
        targetId: id,
        targetType: s.tenantId ? 'tenant' : 'user',
        name: s.storeName || s.userName || id,
        storeName: s.storeName || id,
        ownerName: s.userName || 'User',
        plan: s.plan || 'Basic',
        status: 'Active',
        baseLimit: quotaInfo.baseLimit,
        customLimit: quotaInfo.customLimit,
        effectiveLimit: quotaInfo.effectiveLimit,
        isOverridden: quotaInfo.isOverridden,
        todayUsed,
        updatedAt: quotas[id]?.updatedAt || null
      });
    }
  }

  // 3. Add any overrides not already in list
  for (const [id, rec] of Object.entries(quotas)) {
    if (!seenIds.has(id)) {
      seenIds.add(id);
      const quotaInfo = getTenantAiQuotaLimits(id, rec.plan);
      const todayUsed = getTenantTodayUsed(id);
      results.push({
        targetId: id,
        targetType: rec.targetType || 'tenant',
        name: rec.storeName || rec.name || id,
        storeName: rec.storeName || id,
        ownerName: rec.name || 'Custom Override',
        plan: rec.plan || 'Business',
        status: 'Active',
        baseLimit: quotaInfo.baseLimit,
        customLimit: quotaInfo.customLimit,
        effectiveLimit: quotaInfo.effectiveLimit,
        isOverridden: true,
        todayUsed,
        updatedAt: rec.updatedAt
      });
    }
  }

  return results;
}
