import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

export interface TenantWhatsAppState {
  tenantId: string;
  status: 'DISCONNECTED' | 'PAIRING' | 'CONNECTED';
  pairingCode?: string;
  connectedNumber?: string;
  lastError?: string;
  updatedAt: string;
}

// Memory cache for tenant socket instances & state
const tenantSockets = new Map<string, any>();
const tenantStates = new Map<string, TenantWhatsAppState>();

const SESSIONS_BASE_DIR = path.resolve(process.cwd(), '.whatsapp_sessions');
if (!fs.existsSync(SESSIONS_BASE_DIR)) {
  try {
    fs.mkdirSync(SESSIONS_BASE_DIR, { recursive: true });
  } catch {}
}

export function getTenantState(tenantId: string): TenantWhatsAppState {
  if (tenantStates.has(tenantId)) {
    return tenantStates.get(tenantId)!;
  }
  const sessionDir = path.join(SESSIONS_BASE_DIR, tenantId);
  const isLinked = fs.existsSync(path.join(sessionDir, 'creds.json'));
  const state: TenantWhatsAppState = {
    tenantId,
    status: isLinked ? 'CONNECTED' : 'DISCONNECTED',
    updatedAt: new Date().toISOString()
  };
  tenantStates.set(tenantId, state);
  return state;
}

export async function requestWhatsAppPairing(tenantId: string, rawPhoneNumber: string): Promise<{ success: boolean; pairingCode?: string; error?: string }> {
  try {
    // Sanitize phone number (must be digits only, international format e.g. 923001234567)
    let phone = rawPhoneNumber.replace(/\D/g, '');
    if (phone.startsWith('03')) {
      phone = '92' + phone.substring(1);
    } else if (phone.startsWith('0092')) {
      phone = '92' + phone.substring(4);
    } else if (phone.startsWith('923') && phone.length === 12) {
      // valid
    } else if (phone.length === 10 && phone.startsWith('3')) {
      phone = '92' + phone;
    }

    if (!phone || phone.length < 10) {
      return { success: false, error: 'Invalid phone number format. Please enter a valid number (e.g. 03001234567 or 923001234567).' };
    }

    const sessionDir = path.join(SESSIONS_BASE_DIR, tenantId);
    
    // Existing active socket cleanup
    if (tenantSockets.has(tenantId)) {
      try {
        const oldSock = tenantSockets.get(tenantId);
        oldSock.end(undefined);
      } catch {}
      tenantSockets.delete(tenantId);
    }

    // Clean previous unverified session files so fresh handshake occurs
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch {}
    }
    fs.mkdirSync(sessionDir, { recursive: true });

    // Connect socket and handle lifecycle
    async function startSocket() {
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const { version } = await fetchLatestBaileysVersion();

      const logger = pino({ level: 'silent' });

      const sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000
      });

      tenantSockets.set(tenantId, sock);

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        console.log(`[WhatsApp ${tenantId}] Connection update:`, connection, lastDisconnect?.error?.message || '');

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WhatsApp ${tenantId}] Closed with code ${statusCode}. Should reconnect: ${shouldReconnect}`);

          if (shouldReconnect) {
            // Reconnect immediately to keep pairing session alive
            setTimeout(() => startSocket(), 1500);
          } else {
            const current = getTenantState(tenantId);
            tenantStates.set(tenantId, {
              ...current,
              status: 'DISCONNECTED',
              lastError: (lastDisconnect?.error as any)?.message || 'Logged out',
              updatedAt: new Date().toISOString()
            });
            try {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            } catch {}
          }
        } else if (connection === 'open') {
          console.log(`[WhatsApp ${tenantId}] ✅ Connection successfully OPEN and LINKED!`);
          tenantStates.set(tenantId, {
            tenantId,
            status: 'CONNECTED',
            connectedNumber: phone,
            pairingCode: undefined,
            updatedAt: new Date().toISOString()
          });
        }
      });

      return sock;
    }

    const sock = await startSocket();

    // Request Real Pairing Code if not registered
    if (!sock.authState.creds.registered) {
      await new Promise(res => setTimeout(res, 2500));
      console.log(`[WhatsApp ${tenantId}] Requesting Pairing Code for:`, phone);
      const code = await sock.requestPairingCode(phone);
      console.log(`[WhatsApp ${tenantId}] Received Live Pairing Code:`, code);

      // Format with hyphen e.g. ABCD-1234
      const formattedCode = code ? (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code) : code;

      tenantStates.set(tenantId, {
        tenantId,
        status: 'PAIRING',
        pairingCode: formattedCode,
        connectedNumber: phone,
        updatedAt: new Date().toISOString()
      });

      return {
        success: true,
        pairingCode: formattedCode
      };
    } else {
      tenantStates.set(tenantId, {
        tenantId,
        status: 'CONNECTED',
        connectedNumber: phone,
        updatedAt: new Date().toISOString()
      });
      return {
        success: true,
        pairingCode: undefined
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to request live WhatsApp pairing code'
    };
  }
}

export async function sendWhatsAppMessage(tenantId: string, rawPhone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    let phone = rawPhone.replace(/\D/g, '');
    if (phone.startsWith('03')) {
      phone = '92' + phone.substring(1);
    } else if (phone.startsWith('0092')) {
      phone = '92' + phone.substring(4);
    } else if (phone.startsWith('3') && phone.length === 10) {
      phone = '92' + phone;
    }

    const jid = `${phone}@s.whatsapp.net`;

    let sock = tenantSockets.get(tenantId);
    if (!sock) {
      const sessionDir = path.join(SESSIONS_BASE_DIR, tenantId);
      if (fs.existsSync(path.join(sessionDir, 'creds.json'))) {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();
        sock = makeWASocket({
          version,
          auth: state,
          logger: pino({ level: 'silent' }),
          printQRInTerminal: false,
          browser: ['MBI Inventra', 'Chrome', '1.0.0']
        });
        sock.ev.on('creds.update', saveCreds);
        tenantSockets.set(tenantId, sock);
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    if (!sock) {
      return { success: false, error: 'WhatsApp is not connected for this tenant. Please pair phone in Settings.' };
    }

    await sock.sendMessage(jid, { text: message });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to dispatch WhatsApp message' };
  }
}

export async function disconnectWhatsApp(tenantId: string): Promise<{ success: boolean }> {
  try {
    if (tenantSockets.has(tenantId)) {
      try {
        const sock = tenantSockets.get(tenantId);
        await sock.logout();
      } catch {}
      tenantSockets.delete(tenantId);
    }
    const sessionDir = path.join(SESSIONS_BASE_DIR, tenantId);
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch {}
    }
    tenantStates.set(tenantId, {
      tenantId,
      status: 'DISCONNECTED',
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch {
    return { success: true };
  }
}
