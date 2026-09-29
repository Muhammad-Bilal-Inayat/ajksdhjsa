/**
 * MBI INVENTRA - ASSISTANT LIMITS, TELEMETRY & LIVE SERVER SUPPORT ENGINE
 * 
 * Rules:
 * 1. Basic / Free Tiers: 50 Messages / day
 * 2. Business Tier: 100 Messages / day
 * 3. Enterprise Tier: 500 Messages / day
 * 4. Strictly scoped: Only answers questions related to MBI Inventra software, user dashboard & home features.
 * 5. Tier Gating: Shift Management & Inventory Cloud Sync are explained/accessible for Business & Enterprise only;
 *    lower tiers see "Upgrade to access" and upgrade guidance.
 * 6. Human Escalation: When user requests human team, session is tagged and notified to /server with live chat sync.
 * 7. Click Telemetry: Logs every interaction (widget open, prompt click, message sent, human escalation, voice search).
 */

import { saveRecordToFirestore } from './firebase';

export interface AssistantUsageRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface AssistantPlanLimits {
  planName: string;
  dailyMessageLimit: number;
  hasAdvancedModules: boolean; // Shift Management & Cloud Inventory Sync
}

export interface ClickEventPayload {
  sessionId: string;
  eventType: 'widget_open' | 'widget_close' | 'prompt_chip_click' | 'message_sent' | 'voice_input' | 'human_escalate_click' | 'phone_click' | 'whatsapp_click' | 'plan_upgrade_click' | 'feedback_click';
  eventLabel: string;
  userId?: string;
  userName?: string;
  storeName?: string;
  tenantId?: string;
  userPlan?: string;
  pageContext?: 'home' | 'user' | 'store' | 'checkout';
  metadata?: Record<string, any>;
}

export interface LiveChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'human_agent';
  senderName: string;
  text: string;
  timestamp: string;
  isEscalation?: boolean;
  requiresUpgrade?: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

export interface LiveChatSessionData {
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
  messages: LiveChatMessage[];
}

export function getAssistantPlanLimits(plan?: string, userId?: string, tenantId?: string): AssistantPlanLimits {
  const normalized = (plan || 'Trial').toLowerCase();

  // Check manual server override first
  if (typeof window !== 'undefined') {
    try {
      if (userId) {
        const userOverride = localStorage.getItem(`mbi_ai_override_limit_${userId}`);
        if (userOverride) {
          const parsed = parseInt(userOverride, 10);
          if (!isNaN(parsed) && parsed > 0) {
            return {
              planName: 'Custom Overridden Limit',
              dailyMessageLimit: parsed,
              hasAdvancedModules: true
            };
          }
        }
      }
      if (tenantId) {
        const tenantOverride = localStorage.getItem(`mbi_ai_override_limit_${tenantId}`);
        if (tenantOverride) {
          const parsed = parseInt(tenantOverride, 10);
          if (!isNaN(parsed) && parsed > 0) {
            return {
              planName: 'Tenant Custom Limit',
              dailyMessageLimit: parsed,
              hasAdvancedModules: true
            };
          }
        }
      }
    } catch {}
  }

  // 1. Enterprise (Platinum): 200 daily messages
  if (normalized.includes('enterprise') || normalized.includes('platinum') || normalized.includes('vip')) {
    return {
      planName: 'Enterprise (Platinum)',
      dailyMessageLimit: 200,
      hasAdvancedModules: true
    };
  }

  // 2. Business (Gold): 50 daily messages
  if (normalized.includes('business') || normalized.includes('gold')) {
    return {
      planName: 'Business (Gold)',
      dailyMessageLimit: 50,
      hasAdvancedModules: true
    };
  }

  // 3. Basic (Silver) & Trial / Free: 20 daily messages
  return {
    planName: normalized.includes('basic') || normalized.includes('silver') ? 'Basic (Silver)' : 'Trial / Guest',
    dailyMessageLimit: 20,
    hasAdvancedModules: false
  };
}

export function getTodayUsageKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const cleanId = userId || getGuestAiId();
  return `mbi_ai_usage_${cleanId}_${today}`;
}

export function getGuestAiId(): string {
  if (typeof window === 'undefined') return 'guest_default';
  let guestId = localStorage.getItem('mbi_ai_guest_id');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem('mbi_ai_guest_id', guestId);
  }
  return guestId;
}

export function getTodayMessageCount(userId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const key = getTodayUsageKey(userId || getGuestAiId());
    const count = parseInt(localStorage.getItem(key) || '0', 10);
    return isNaN(count) ? 0 : count;
  } catch (e) {
    return 0;
  }
}

export function incrementTodayMessageCount(userId?: string): number {
  if (typeof window === 'undefined') return 1;
  try {
    const key = getTodayUsageKey(userId || getGuestAiId());
    const count = getTodayMessageCount(userId) + 1;
    localStorage.setItem(key, count.toString());
    return count;
  } catch (e) {
    return 1;
  }
}

export function resetUserAiUsage(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getTodayUsageKey(userId);
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent('mbi-ai-quota-updated', { detail: { userId, count: 0 } }));
  } catch {}
}

export function setUserAiCustomLimit(userId: string, limit: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`mbi_ai_override_limit_${userId}`, limit.toString());
    window.dispatchEvent(new CustomEvent('mbi-ai-quota-updated', { detail: { userId, customLimit: limit } }));
  } catch {}
}

export function isHumanSupportRequested(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const humanKeywords = [
    'human', 'team', 'rabta', 'agent', 'support', 'call me', 'talk to person',
    'customer care', 'representative', 'owner', 'admin se baat', 'contact team',
    'helpline', 'whatsapp support', 'bilal', 'help me live', 'call back', 'phone number',
    'support person', 'helpdesk'
  ];
  return humanKeywords.some(k => lower.includes(k));
}

/**
 * Record user click & interaction telemetry to server
 */
export async function trackAiClickEvent(event: ClickEventPayload): Promise<void> {
  // 1. Save locally in localStorage for fast UI rendering
  try {
    const key = 'mbi_ai_local_clicks_v1';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    current.unshift({ ...event, id: `clk_${Date.now()}`, timestamp: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(current.slice(0, 100)));
    window.dispatchEvent(new CustomEvent('mbi-ai-click-recorded', { detail: event }));
  } catch (e) {}

  // 2. Post to master backend API
  try {
    await fetch('/api/ai/telemetry/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Fetch or init Live Chat session from Server
 */
export async function fetchLiveChatSession(sessionId: string, userMeta?: {
  userId?: string;
  userName?: string;
  storeName?: string;
  tenantId?: string;
  plan?: string;
  pageContext?: string;
}): Promise<LiveChatSessionData | null> {
  try {
    const query = new URLSearchParams({
      userId: userMeta?.userId || 'usr_client',
      userName: userMeta?.userName || 'Pharmacist',
      storeName: userMeta?.storeName || 'Pharmacy Store',
      tenantId: userMeta?.tenantId || 'tenant-01',
      plan: userMeta?.plan || 'business',
      pageContext: userMeta?.pageContext || 'user'
    }).toString();

    const res = await fetch(`/api/ai/chat/sessions/${sessionId}?${query}`);
    if (res.ok) {
      const data = await res.json();
      return data.session || null;
    }
  } catch (e) {
    console.warn('Could not fetch live chat session from server:', e);
  }
  return null;
}

/**
 * Post message into Live Chat session (User or Human Support)
 */
export async function sendLiveChatMessage(params: {
  sessionId: string;
  text: string;
  sender?: 'user' | 'human_agent';
  senderName?: string;
  isEscalation?: boolean;
  userMeta?: {
    userId?: string;
    userName?: string;
    userPhone?: string;
    userEmail?: string;
    storeName?: string;
    tenantId?: string;
    plan?: string;
    pageContext?: 'home' | 'user' | 'store' | 'checkout';
  };
  autoAiReply?: boolean;
}): Promise<{ session: LiveChatSessionData | null; userMessage?: LiveChatMessage; aiMessage?: LiveChatMessage }> {
  try {
    const res = await fetch(`/api/ai/chat/sessions/${params.sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: params.sender || 'user',
        senderName: params.senderName || 'User',
        text: params.text,
        isEscalation: params.isEscalation || false,
        userMeta: params.userMeta,
        autoAiReply: params.autoAiReply ?? true
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        session: data.session || null,
        userMessage: data.userMessage || data.message,
        aiMessage: data.aiMessage
      };
    }
  } catch (e) {
    console.warn('Error sending live chat message:', e);
  }
  return { session: null };
}

/**
 * Dispatch human escalation alert to Master Server & Firestore
 */
export async function forwardHumanRequestToServer(params: {
  userId: string;
  userName: string;
  userPhone: string;
  storeName: string;
  tenantId: string;
  userMessage: string;
}): Promise<void> {
  const payload = {
    id: `lead_human_${Date.now()}`,
    type: 'HUMAN_SUPPORT_REQUEST',
    storeName: params.storeName || 'Pharmacy Store',
    ownerName: params.userName || 'Pharmacist',
    phone: params.userPhone || 'Not provided',
    email: '',
    tenantId: params.tenantId || 'tenant-01',
    userId: params.userId,
    status: 'pending_activation',
    message: `[AI Assistant Human Request]: "${params.userMessage}"`,
    createdAt: new Date().toISOString()
  };

  // 1. Store in localStorage for /server live detection
  try {
    const stored = localStorage.getItem('mbi_registration_leads_v2') || '[]';
    const leads = JSON.parse(stored);
    leads.unshift(payload);
    localStorage.setItem('mbi_registration_leads_v2', JSON.stringify(leads));
    window.dispatchEvent(new CustomEvent('mbi-registration-leads-updated'));
  } catch (e) {}

  // 2. Broadcast to Backend API Server
  try {
    await fetch('/api/master/registration-leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-master-secret': 'MBI-SECRET-KEY-PROD-2026-X99'
      },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (e) {}

  // 3. Post to AI leads API
  try {
    await fetch('/api/ai/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: params.storeName,
        phone: params.userPhone,
        question: `[Human Support Escalation]: ${params.userMessage}`,
        plan: 'Business'
      })
    }).catch(() => {});
  } catch (e) {}

  // 4. Sync to Firestore if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      saveRecordToFirestore('registration_leads', payload.id, payload).catch(() => {});
    } catch (e) {}
  }
}

/**
 * Fallback Knowledge Base Engine - Strictly scoped to MBI Inventra software & Home/User portal features
 */
export function generateMbiAssistantResponse(prompt: string, plan: string): {
  text: string;
  isHumanEscalation: boolean;
  requiresUpgrade: boolean;
} {
  const p = prompt.toLowerCase();
  const limits = getAssistantPlanLimits(plan);

  // Check Human Support Request
  if (isHumanSupportRequested(p)) {
    return {
      text: `Shukriya! Maine aapki chat MBI Inventra Central Server Support Desk ko transfer kar di hai. Hamare live agent yahan direct chat mein connect ho rahe hain. Aap urgent call ke liye WhatsApp bhi kar sakte hain: +92 300 1234567.`,
      isHumanEscalation: true,
      requiresUpgrade: false
    };
  }

  // Tier Gating: Shift Management & Cloud Inventory Sync checks
  if (p.includes('shift') || p.includes('cashier closing') || p.includes('drawer') || p.includes('reconciliation')) {
    if (!limits.hasAdvancedModules) {
      return {
        text: `🔒 **Shift Management & Cashier Closing (Business & Enterprise Feature)**\n\nYeh feature Cashier Shifts, Opening Cash, Cash in Hand reconciliation aur anti-theft counter balancing manage karta hai.\n\n⚠️ **Upgrade to access**: Aapka current plan **${limits.planName}** hai. Shift Management aur Cash Reconciliation access karne ke liye **Business Plan (Rs 3,999/mo)** ya **Enterprise Plan** par upgrade karein. Dashboard par Pricing modal se 1-click upgrade karein!`,
        isHumanEscalation: false,
        requiresUpgrade: true
      };
    }
    return {
      text: `✅ **Shift Management Guide (Active on your ${limits.planName} Plan)**:\n\n1. Left sidebar se **Shift Management** par jayein ya Alt+M press karein.\n2. **Open Shift**: Shift shuru karne ke waqt drawer mein mojood initial cash darj karein.\n3. **Active Billing**: Cashier ki har transaction auto-record hoti rahegi.\n4. **Close Shift**: Day-end par physical cash count likhein. System auto-calculate karega agar koi cash short ya surplus ho!`,
      isHumanEscalation: false,
      requiresUpgrade: false
    };
  }

  if (p.includes('cloud sync') || p.includes('multi branch') || p.includes('inter store') || p.includes('inventory sync')) {
    if (!limits.hasAdvancedModules) {
      return {
        text: `🔒 **Multi-Branch Real-Time Inventory Sync (Business & Enterprise Feature)**\n\nReal-time inter-branch stock sync aur live multi-store inventory transfer sirf Business aur Enterprise tiers par active hai.\n\n⚠️ **Upgrade to access**: Aapke current **${limits.planName}** plan mein local offline sync mojood hai lekin full multi-branch cloud sync ke liye **Business Plan (Rs 3,999/mo)** par upgrade karein.`,
        isHumanEscalation: false,
        requiresUpgrade: true
      };
    }
    return {
      text: `✅ **Inventory Sync Guide (Active on your ${limits.planName} Plan)**:\n\n1. MBI Inventra **0-latency high-speed cloud sync** har 4 second baad background mein chalta hai.\n2. Ek branch se stock transfer hone par doosri branch par auto-update ho jata hai.\n3. Sync status dekhne ke liye top navigation bar par **Sync Indicator** check karein.`,
      isHumanEscalation: false,
      requiresUpgrade: false
    };
  }

  // General MBI Inventra Knowledge Base (Strictly scoped)
  if (p.includes('bill') || p.includes('pos') || p.includes('f2') || p.includes('sale') || p.includes('thermal') || p.includes('print')) {
    return {
      text: `🧾 **POS Billing & Thermal Prints (MBI Inventra)**:\n- **F2 Shortcut**: Instant medicine search window open karta hai. Barcode scan karein ya naam type karein.\n- **Thermal Prints**: 58mm aur 80mm ESC/POS printers auto-detect hotay hain.\n- **WhatsApp Invoice**: Bill save hotay hi customer ke WhatsApp number par 1-click PDF receipt chali jati hai.`,
      isHumanEscalation: false,
      requiresUpgrade: false
    };
  }

  if (p.includes('expiry') || p.includes('fefo') || p.includes('batch') || p.includes('stock') || p.includes('item') || p.includes('medicine')) {
    return {
      text: `📦 **Smart Inventory & Batch Expiry (FEFO Engine)**:\n- **FEFO Logic**: System billing ke waqt automatically pehle expire hone wala batch deduct karta hai.\n- **Expiry Badges**: 30 din mein expire hone wali medicines Red, aur 90 din wali Yellow alert show karti hain.\n- **Shortage Registry**: Jo item customer maange aur stock mein na ho, system auto-record karke Purchase Order generate kar deta hai.`,
      isHumanEscalation: false,
      requiresUpgrade: false
    };
  }

  if (p.includes('udhaar') || p.includes('ledger') || p.includes('party') || p.includes('customer') || p.includes('supplier') || p.includes('khata')) {
    return {
      text: `📒 **Customer & Supplier Ledgers (Double-Entry Accounting)**:\n- **Customer Khata**: Sale bill banatay waqt customer select karein. Balance Due ledger mein auto-add ho jayega.\n- **Payment In / Out**: Cash received ya supplier payment record karne ke liye **Bank & Cash in Hand** module use karein.\n- **WhatsApp Statement**: Customer ledger statement 1 click mein WhatsApp par share karein.`,
      isHumanEscalation: false,
      requiresUpgrade: false
    };
  }

  if (p.includes('backup') || p.includes('offline') || p.includes('internet') || p.includes('data')) {
    return {
      text: `🛡️ **Offline Engine & Encrypted Backups**:\n- **100% Offline Mode**: Internet band hone par bhi billing aur scanning 0-second speed se chalti rehti hai.\n- **Auto Cloud Backup**: Har 15 minute baad background encrypted snapshot server par save hota hai.\n- **Manual Export**: Settings > Utilities se full JSON/Excel backup download kar sakte hain.`,
      isHumanEscalation: false,
      requiresUpgrade: false
    };
  }

  if (p.includes('user') || p.includes('dashboard') || p.includes('portal') || p.includes('role') || p.includes('pin') || p.includes('staff')) {
    return {
      text: `👤 **User Portal & Dashboard Controls**:\n- **Quick Metrics**: Top dashboard par Today Sales, Gross Profit, Total Stock Value aur Low Stock Items live show hotay hain.\n- **Staff PINs**: Cashiers aur managers ke liye 4-digit PIN set karein taake unauthorized discount ya bill deletion block ho sake.\n- **Master Control**: Admin /server se kisi bhi staff member ko live control aur permissions assign kar sakta hai.`,
      isHumanEscalation: false,
      requiresUpgrade: false
    };
  }

  if (p.includes('price') || p.includes('plan') || p.includes('cost') || p.includes('subscription')) {
    return {
      text: `💎 **MBI Inventra Subscription Plans**:\n- **Starter / Basic**: Rs 1,999/mo (Single counter, POS, Expiry, WhatsApp bill, 50 AI Msgs/day)\n- **Business / Pro**: Rs 3,999/mo (Multi-user, Shift Management, Inventory Sync, 100 AI Msgs/day)\n- **Enterprise Chain**: Rs 6,999/mo (Unlimited branches, central warehouse, 500 AI Msgs/day)\n\nDashboard par **Pricing** button se instant activate karein!`,
      isHumanEscalation: false,
      requiresUpgrade: false
    };
  }

  return {
    text: `Main MBI INVENTRA AI Guide hoon aur main sirf MBI Inventra Pharmacy ERP Software, User Dashboard, POS Billing, Inventory, Ledgers, aur Home Page features ke baare mein madad kar sakta hoon.\n\nAap pooch sakte hain:\n- POS Billing aur F2 shortcut kaise use karein?\n- Batch expiry aur FEFO deduction kaise kaam karta hai?\n- Shift Management aur Cashier closing kaise karein?\n- Human support team se rabta kaise karein?`,
    isHumanEscalation: false,
    requiresUpgrade: false
  };
}
