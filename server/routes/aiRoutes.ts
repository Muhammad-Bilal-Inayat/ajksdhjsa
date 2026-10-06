import { Router } from 'express';
import { 
  generateAiResponse, 
  getAiConfigStatus, 
  addSupportLead, 
  getSupportLeads, 
  updateLeadStatus, 
  saveSettings,
  testSingleKey,
  recordClickEvent,
  getClickTelemetryAnalytics,
  getAllChatSessions,
  getChatSessionById,
  addMessageToSession,
  updateSessionStatus,
  clearSession,
  getOrCreateChatSession,
  getAiChatHistoryFromMariaDb,
  getArchivedChatSessions,
  archiveSession,
  unarchiveSession,
  addCustomApiKey,
  removeCustomApiKey,
  getAllTenantAiQuotasList,
  setTenantQuotaOverride,
  resetTenantDailyUsage
} from '../services/aiAssistantService';
import { saveAiChatLogToMariaDb } from '../db/mariaClient';

export const aiRouter = Router();

// ----------------------------------------------------
// IMMUTABLE MARIADB CHAT AUDIT LOGS
// ----------------------------------------------------
aiRouter.get('/audit/immutable-logs', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 200);
    const tenantId = req.query.tenantId as string;
    const sessionId = req.query.sessionId as string;
    const search = req.query.search as string;

    const logs = await getAiChatHistoryFromMariaDb({ limit, tenantId, sessionId, search });
    res.json({ success: true, logs, total: logs.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ----------------------------------------------------
// TELEMETRY & CLICKS
// ----------------------------------------------------
aiRouter.post('/telemetry/click', (req, res) => {
  try {
    const { sessionId, eventType, eventLabel, userId, userName, storeName, tenantId, userPlan, pageContext, metadata } = req.body;
    
    if (!eventType || !eventLabel) {
      return res.status(400).json({ error: 'eventType and eventLabel are required.' });
    }

    const event = recordClickEvent({
      sessionId: sessionId || `sess_${Date.now()}`,
      eventType,
      eventLabel,
      userId,
      userName,
      storeName,
      tenantId,
      userPlan,
      pageContext: pageContext || 'user',
      metadata,
      ip: req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1'
    });

    res.json({ success: true, event });
  } catch (err: any) {
    console.error('Error logging click telemetry:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

aiRouter.get('/telemetry/analytics', (req, res) => {
  try {
    const analytics = getClickTelemetryAnalytics();
    res.json({ success: true, analytics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ----------------------------------------------------
// LIVE TWO-WAY CHAT & MANUAL SERVER SUPPORT
// ----------------------------------------------------
// List all chat sessions
aiRouter.get('/chat/sessions', (req, res) => {
  try {
    const filter = req.query.filter as any;
    const sessions = getAllChatSessions(filter);
    res.json({ success: true, sessions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Get or initialize a chat session
aiRouter.get('/chat/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = getChatSessionById(sessionId);
    if (!session) {
      // Auto-create on first fetch if query params provide user info
      const created = getOrCreateChatSession({
        sessionId,
        userId: req.query.userId as string,
        userName: req.query.userName as string,
        storeName: req.query.storeName as string,
        tenantId: req.query.tenantId as string,
        plan: req.query.plan as string,
        pageContext: req.query.pageContext as any
      });
      return res.json({ success: true, session: created });
    }
    res.json({ success: true, session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Send message to chat session (User or Server Human Agent)
aiRouter.post('/chat/sessions/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { 
      sender = 'user', 
      senderName = 'User', 
      text, 
      isEscalation = false,
      userMeta,
      autoAiReply = true
    } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    // Log message sent click event
    recordClickEvent({
      sessionId,
      eventType: isEscalation ? 'human_escalate_click' : 'message_sent',
      eventLabel: isEscalation ? `Human Escalation: ${text.substring(0, 30)}` : `User Msg: ${text.substring(0, 30)}`,
      userId: userMeta?.userId,
      userName: userMeta?.userName,
      storeName: userMeta?.storeName,
      tenantId: userMeta?.tenantId,
      userPlan: userMeta?.plan,
      pageContext: userMeta?.pageContext || 'user'
    });

    // 1. Add incoming message
    const { session, message } = addMessageToSession({
      sessionId,
      sender,
      senderName,
      text,
      isEscalation,
      userMeta
    });

    // If human agent sent this message from /server, no AI bot response needed
    if (sender === 'human_agent') {
      return res.json({
        success: true,
        session,
        message,
        operatorReply: true
      });
    }

    // If user requested human support, also log to Leads table
    if (isEscalation) {
      addSupportLead({
        businessName: userMeta?.storeName || 'Pharmacy Customer',
        userEmail: userMeta?.userEmail || 'support@mbiinventra.com',
        phone: userMeta?.userPhone || 'N/A',
        question: `[Live Chat Escalation]: ${text}`,
        plan: userMeta?.plan || 'business'
      });
    }

    // If session is already actively handled by human agent, do NOT auto-reply with AI
    if (session.status === 'human_active' || !autoAiReply) {
      return res.json({
        success: true,
        session,
        message,
        aiGenerated: false
      });
    }

    // 2. Otherwise, generate AI response
    try {
      const history = session.messages.slice(-8).map(m => ({
        role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.text }]
      }));

      const aiResult = await generateAiResponse(
        text, 
        userMeta?.pageContext || 'user', 
        userMeta?.plan || 'business', 
        history,
        {
          tenantId: userMeta?.tenantId,
          storeName: userMeta?.storeName,
          userName: userMeta?.userName,
          userEmail: userMeta?.userEmail,
          phone: userMeta?.userPhone
        }
      );

      // Add AI response to session
      const aiMsg = addMessageToSession({
        sessionId,
        sender: 'ai',
        senderName: 'MBI AI Guide',
        text: aiResult.text,
        isEscalation: aiResult.humanLeadTriggered
      });

      res.json({
        success: true,
        session: aiMsg.session,
        userMessage: message,
        aiMessage: aiMsg.message,
        humanLeadTriggered: aiResult.humanLeadTriggered
      });
    } catch (aiErr: any) {
      // Return user message even if AI failed
      res.json({
        success: true,
        session,
        userMessage: message,
        aiError: aiErr?.message
      });
    }
  } catch (err: any) {
    console.error('Error posting chat message:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Update session status (e.g. Server operator takes over or marks resolved)
aiRouter.post('/chat/sessions/:sessionId/status', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status, agentName } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const updated = updateSessionStatus(sessionId, status, agentName);
    if (!updated) return res.status(404).json({ error: 'Session not found.' });

    res.json({ success: true, session: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Clear or delete a session
aiRouter.delete('/chat/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    clearSession(sessionId);
    res.json({ success: true, message: 'Session removed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Get all archived sessions (7-day or 20+ cap auto-archived)
aiRouter.get('/chat/archived-sessions', (req, res) => {
  try {
    const archived = getArchivedChatSessions();
    res.json({ success: true, sessions: archived, total: archived.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Explicitly archive a session
aiRouter.post('/chat/sessions/:sessionId/archive', (req, res) => {
  try {
    const { sessionId } = req.params;
    const ok = archiveSession(sessionId);
    if (!ok) return res.status(404).json({ error: 'Session not found in active list.' });
    res.json({ success: true, message: 'Session archived successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Unarchive/restore session to live desk
aiRouter.post('/chat/sessions/:sessionId/unarchive', (req, res) => {
  try {
    const { sessionId } = req.params;
    const ok = unarchiveSession(sessionId);
    if (!ok) return res.status(404).json({ error: 'Session not found in archived vault.' });
    res.json({ success: true, message: 'Session restored to active live desk.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ----------------------------------------------------
// ASK AI DIRECT (Fallback legacy endpoint)
// ----------------------------------------------------
aiRouter.post('/ask', async (req, res) => {
  try {
    const { prompt, context = 'user', userPlan = 'business', history = [], businessName = 'Pharmacy', userEmail = '', phone = '', sessionId } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required.' });
    }

    if (sessionId) {
      recordClickEvent({
        sessionId,
        eventType: 'message_sent',
        eventLabel: prompt.substring(0, 30),
        storeName: businessName,
        userPlan,
        pageContext: context
      });
    }

    const result = await generateAiResponse(
      prompt, 
      context, 
      userPlan, 
      history,
      {
        tenantId: req.body.tenantId,
        storeName: businessName,
        userName: req.body.userName || businessName,
        userEmail: userEmail,
        phone: phone
      }
    );

    // If human support requested, auto-log lead
    let lead = null;
    if (result.humanLeadTriggered) {
      lead = addSupportLead({
        businessName: businessName || 'Pharmacy User',
        userEmail: userEmail || 'user@mbiinventra.com',
        phone: phone || 'Not Provided',
        question: prompt,
        plan: userPlan || 'business'
      });
    }

    // Log both user prompt and AI response to MariaDB immutable history
    const activeSess = sessionId || `ask_${Date.now()}`;
    saveAiChatLogToMariaDb({
      sessionId: activeSess,
      tenantId: req.body.tenantId || 'default',
      userId: req.body.userId,
      userName: req.body.userName || businessName,
      storeName: businessName,
      userPlan: userPlan,
      sender: 'user',
      text: prompt,
      pageContext: context
    }).catch(() => {});

    saveAiChatLogToMariaDb({
      sessionId: activeSess,
      tenantId: req.body.tenantId || 'default',
      userId: req.body.userId,
      userName: req.body.userName || businessName,
      storeName: businessName,
      userPlan: userPlan,
      sender: 'ai',
      senderName: 'MBI AI Guide',
      text: result.text,
      isEscalation: result.humanLeadTriggered,
      keyIndexUsed: result.keyIndexUsed,
      pageContext: context
    }).catch(() => {});

    res.json({
      success: true,
      text: result.text,
      humanLeadTriggered: result.humanLeadTriggered,
      leadLogged: !!lead,
      keyIndexUsed: result.keyIndexUsed
    });
  } catch (err: any) {
    console.error('Error in /api/ai/ask:', err);
    res.status(500).json({ 
      success: false, 
      error: err?.message || 'Failed to generate AI response.' 
    });
  }
});

// ----------------------------------------------------
// LEADS & INQUIRIES
// ----------------------------------------------------
aiRouter.post('/leads', (req, res) => {
  try {
    const { businessName, userEmail, phone, question, plan } = req.body;
    if (!phone && !userEmail) {
      return res.status(400).json({ error: 'Phone number or email is required to connect with team.' });
    }

    const lead = addSupportLead({
      businessName: businessName || 'Pharmacy Customer',
      userEmail: userEmail || 'support@mbiinventra.com',
      phone: phone || 'N/A',
      question: question || 'Requested direct human support call.',
      plan: plan || 'business'
    });

    res.json({ success: true, lead, message: 'Your support inquiry has been sent to our team dashboard!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

aiRouter.get('/leads', (req, res) => {
  try {
    const leads = getSupportLeads();
    res.json({ success: true, leads });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

aiRouter.patch('/leads/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updated = updateLeadStatus(id, status, notes);
    if (!updated) return res.status(404).json({ error: 'Lead not found.' });
    res.json({ success: true, lead: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ----------------------------------------------------
// SETTINGS & HEALTH
// ----------------------------------------------------
aiRouter.post('/test-key', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required.' });
    const result = await testSingleKey(key);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

aiRouter.get('/settings', (req, res) => {
  try {
    const status = getAiConfigStatus();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

aiRouter.post('/settings', (req, res) => {
  try {
    const { isAiEnabledGlobally, allowedPlans, customKeys, homePageEnabled, autoGreeting, humanSupportNumber } = req.body;
    
    saveSettings({
      isAiEnabledGlobally: Boolean(isAiEnabledGlobally),
      allowedPlans: allowedPlans || { basic: false, business: true, enterprise: true },
      customKeys: Array.isArray(customKeys) ? customKeys.filter((k: string) => k.trim().length > 5) : [],
      homePageEnabled: Boolean(homePageEnabled),
      autoGreeting: autoGreeting || 'Assalam-o-Alaikum! Main MBI AI Guide aur Live Support Assistant hoon. Main aapki kya madad kar sakta hoon?',
      humanSupportNumber: humanSupportNumber || '+923281302636'
    });

    res.json({ success: true, status: getAiConfigStatus(), message: 'AI Assistant configuration updated successfully!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Add a new Gemini API Key
aiRouter.post('/keys/add', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, error: 'API key string is required.' });
    }
    const result = await addCustomApiKey(key);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to add API key.' });
  }
});

// Remove an existing Gemini API Key
aiRouter.post('/keys/remove', (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, error: 'API key string is required.' });
    }
    const result = removeCustomApiKey(key);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to remove API key.' });
  }
});

// ----------------------------------------------------
// PER-TENANT AI QUOTAS & USAGE OVERRIDES
// ----------------------------------------------------
// Get all tenants quota & today usage status
aiRouter.get('/quotas', (req, res) => {
  try {
    const quotas = getAllTenantAiQuotasList();
    res.json({ success: true, quotas });
  } catch (err: any) {
    console.error('Error fetching tenant AI quotas:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Set custom daily limit override for a tenant or user
aiRouter.post('/quotas/override', (req, res) => {
  try {
    const { targetId, customLimit, name, storeName, plan, targetType } = req.body;
    if (!targetId || customLimit === undefined) {
      return res.status(400).json({ success: false, error: 'targetId and customLimit are required.' });
    }

    const limitNum = Number(customLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      return res.status(400).json({ success: false, error: 'customLimit must be a valid non-negative number.' });
    }

    const record = setTenantQuotaOverride(targetId, limitNum, {
      name,
      storeName,
      plan,
      targetType
    });

    const allQuotas = getAllTenantAiQuotasList();
    res.json({
      success: true,
      message: `Custom limit of ${limitNum} msgs/day saved permanently for ${storeName || name || targetId}!`,
      record,
      quotas: allQuotas
    });
  } catch (err: any) {
    console.error('Error setting tenant quota override:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Reset today's message usage to 0 for a tenant
aiRouter.post('/quotas/reset', (req, res) => {
  try {
    const { targetId } = req.body;
    if (!targetId) {
      return res.status(400).json({ success: false, error: 'targetId is required.' });
    }

    const record = resetTenantDailyUsage(targetId);
    const allQuotas = getAllTenantAiQuotasList();
    res.json({
      success: true,
      message: `Today's AI usage counter successfully reset to 0 for ${targetId}!`,
      record,
      quotas: allQuotas
    });
  } catch (err: any) {
    console.error('Error resetting tenant AI usage:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

