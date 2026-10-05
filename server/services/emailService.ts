import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface EmailSettings {
  enabled: boolean;
  smtpService: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  adminEmail: string;
  senderName: string;
  senderEmail: string;
}

const SETTINGS_FILE = path.resolve(process.cwd(), 'server', 'data', 'master', 'email_settings.json');

// Ensure parent dir exists
const ensureSettingsDir = () => {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const DEFAULT_SETTINGS: EmailSettings = {
  enabled: true,
  smtpService: 'gmail',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: 'mbiinventra@gmail.com',
  smtpPass: 'pnbxzmnrwthdgocy', // 16-digit Google App Password
  adminEmail: 'mbiinventra@gmail.com',
  senderName: 'MBI INVENTRA Cloud ERP',
  senderEmail: 'mbiinventra@gmail.com'
};

export function getEmailSettings(): EmailSettings {
  try {
    ensureSettingsDir();
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (e) {
    console.warn('[EMAIL SETTINGS LOAD ERROR]:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveEmailSettings(settings: Partial<EmailSettings>): EmailSettings {
  try {
    ensureSettingsDir();
    const current = getEmailSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (e) {
    console.error('[EMAIL SETTINGS SAVE ERROR]:', e);
    throw e;
  }
}

function createTransporter(settings: EmailSettings) {
  if (settings.smtpService === 'gmail' || settings.smtpHost.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: settings.smtpUser.trim(),
        pass: settings.smtpPass.replace(/\s+/g, '') // remove spaces from app password
      }
    });
  }

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort || 465,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser.trim(),
      pass: settings.smtpPass.trim()
    }
  });
}

/**
 * Universal Email Dispatcher with Anti-Spam & Deliverability Optimization
 */
export async function sendEmail({
  to,
  subject,
  html,
  text
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const settings = getEmailSettings();
    if (!settings.enabled) {
      console.log('[EMAIL NOTICE]: Email sending is disabled in settings.');
      return { success: false, error: 'Email service is disabled' };
    }

    if (!settings.smtpUser || !settings.smtpPass) {
      console.warn('[EMAIL WARNING]: SMTP credentials missing.');
      return { success: false, error: 'SMTP credentials not configured' };
    }

    const transporter = createTransporter(settings);
    const toRecipients = Array.isArray(to) ? to.join(', ') : to;

    // Clean plain text generation to satisfy spam filters (High Text-to-HTML ratio)
    const cleanText = text || html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, '  ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    const uniqueMessageId = `<mbi.${Date.now()}.${Math.random().toString(36).substring(2, 9)}@gmail.com>`;

    const mailOptions: any = {
      from: `"${settings.senderName || 'MBI INVENTRA Cloud ERP'}" <${settings.smtpUser}>`,
      to: toRecipients,
      replyTo: settings.adminEmail || settings.smtpUser,
      subject,
      text: cleanText,
      html,
      // Anti-Spam & 2024 Inbox Deliverability Headers
      headers: {
        'Message-ID': uniqueMessageId,
        'X-Mailer': 'MBI INVENTRA Cloud ERP Deliverability Engine',
        'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'List-Unsubscribe': `<mailto:${settings.smtpUser}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Feedback-ID': `MBI-INVENTRA-TRANSACTIONAL:${settings.smtpUser}:cloud-erp`
      }
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`[EMAIL DISPATCH SUCCESS] Subject: "${subject}" -> To: ${toRecipients} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[EMAIL DISPATCH ERROR]:', err?.message || err);
    return { success: false, error: err?.message || 'Failed to send email' };
  }
}

/**
 * 1. Automated Admin Alert: Triggered whenever a new Pharmacy/Store registers
 */
export async function sendAdminAlertNewTenant(tenantData: {
  storeName: string;
  ownerName: string;
  username: string;
  phone: string;
  email?: string;
  city?: string;
  plan?: string;
  tenantId?: string;
}) {
  const settings = getEmailSettings();
  const adminEmail = settings.adminEmail || 'mbiinventra@gmail.com';

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 25px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 25px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">🚨 New Pharmacy Registered!</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">MBI INVENTRA Super-Admin Notification</p>
        </div>
        <div style="padding: 25px;">
          <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 0;">A new tenant has just registered on your Cloud POS platform:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px; font-weight: bold; color: #64748b;">Pharmacy Name:</td><td style="padding: 10px; font-weight: 800; color: #1e293b;">${tenantData.storeName}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px; font-weight: bold; color: #64748b;">Owner Name:</td><td style="padding: 10px; font-weight: bold; color: #1e293b;">${tenantData.ownerName}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px; font-weight: bold; color: #64748b;">Username / ID:</td><td style="padding: 10px; font-family: monospace; font-weight: bold; color: #2563eb;">${tenantData.username}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px; font-weight: bold; color: #64748b;">Phone Number:</td><td style="padding: 10px; font-weight: bold; color: #1e293b;">${tenantData.phone}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px; font-weight: bold; color: #64748b;">Email Address:</td><td style="padding: 10px; color: #1e293b;">${tenantData.email || '—'}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px; font-weight: bold; color: #64748b;">City / Location:</td><td style="padding: 10px; color: #1e293b;">${tenantData.city || 'Pakistan'}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px; font-weight: bold; color: #64748b;">Subscription Plan:</td><td style="padding: 10px; font-weight: bold; color: #059669;">${tenantData.plan || '30-Day Free Trial'}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold; color: #64748b;">Tenant Vault ID:</td><td style="padding: 10px; font-family: monospace; font-size: 11px; color: #64748b;">${tenantData.tenantId || 'auto_assigned'}</td></tr>
          </table>
          <div style="text-align: center; margin-top: 25px;">
            <a href="https://mbiinventra.com/server" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 13px; display: inline-block;">Open Server License HQ</a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b;">
          MBI INVENTRA Automated Cloud Notification Engine • 24/7 Realtime Monitoring
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `🚨 New Pharmacy Registration: ${tenantData.storeName} (${tenantData.phone})`,
    html
  });
}

/**
 * 2. Automated Welcome Email: Sent to the newly registered Tenant / Customer
 */
export async function sendTenantWelcomeEmail(tenantData: {
  toEmail: string;
  storeName: string;
  ownerName: string;
  username: string;
  pin?: string;
  portalUrl?: string;
}) {
  if (!tenantData.toEmail || !tenantData.toEmail.includes('@')) return;

  const url = tenantData.portalUrl || 'https://mbiinventra.com';
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 25px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 25px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800;">🎉 Welcome to MBI INVENTRA!</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.95;">Your Cloud POS & Pharmacy ERP is Ready</p>
        </div>
        <div style="padding: 25px;">
          <p style="font-size: 15px; color: #334155; line-height: 1.5;">Dear <strong>${tenantData.ownerName}</strong>,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.5;">
            Congratulations! Your official pharmacy account for <strong>${tenantData.storeName}</strong> has been created with high-speed 0ms offline capability.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">🔑 Your Login Credentials</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Login Identifier:</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #2563eb;">${tenantData.username}</td></tr>
              ${tenantData.pin ? `<tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Fast Login PIN:</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #059669; font-size: 16px;">${tenantData.pin}</td></tr>` : ''}
              <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Portal URL:</td><td style="padding: 6px 0;"><a href="${url}" style="color: #2563eb; font-weight: bold;">${url}</a></td></tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="${url}" style="background-color: #059669; color: white; padding: 13px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">Launch Pharmacy Dashboard</a>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-top: 25px; line-height: 1.5;">
            Need help? Contact MBI Support 24/7 on WhatsApp: <strong>+92 336 4585863</strong> / <strong>+92 328 1302636</strong>.
          </p>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
          <p style="margin: 0 0 4px 0; font-weight: 600;">MBI INVENTRA Cloud ERP • Official Pharmacy Management Suite</p>
          <p style="margin: 0; color: #94a3b8;">Sargodha, Punjab, Pakistan • Support: +92 336 4585863</p>
          <p style="margin: 6px 0 0 0; font-size: 10px; color: #94a3b8;">You received this transactional email for your pharmacy account on MBI INVENTRA.</p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: tenantData.toEmail,
    subject: `[MBI INVENTRA] Welcome ${tenantData.storeName} — Your Cloud POS Account is Ready`,
    html
  });
}

/**
 * 3. Automated Staff / Cashier Invitation Email
 */
export async function sendStaffInvitationEmail(staffData: {
  toEmail: string;
  storeName: string;
  staffName: string;
  role: string;
  pin: string;
  portalUrl?: string;
}) {
  if (!staffData.toEmail || !staffData.toEmail.includes('@')) return;

  const url = staffData.portalUrl || 'https://mbiinventra.com';
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 25px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); padding: 22px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Staff Access Invitation</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">${staffData.storeName}</p>
        </div>
        <div style="padding: 22px;">
          <p style="font-size: 14px; color: #334155;">Hello <strong>${staffData.staffName}</strong>,</p>
          <p style="font-size: 13px; color: #334155;">
            You have been assigned access to the pharmacy management portal as <strong>${staffData.role}</strong>.
          </p>
          <div style="background: #f1f5f9; border-radius: 10px; padding: 15px; margin: 15px 0; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">Your 4-Digit Fast Login PIN</p>
            <p style="margin: 6px 0 0 0; font-size: 26px; font-family: monospace; font-weight: 900; color: #2563eb; letter-spacing: 4px;">${staffData.pin}</p>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${url}" style="background-color: #2563eb; color: white; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">Open POS Counter</a>
          </div>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8;">
          MBI INVENTRA Cloud ERP • Sargodha, Punjab, Pakistan
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: staffData.toEmail,
    subject: `[MBI INVENTRA] Staff Access Credentials — ${staffData.storeName}`,
    html
  });
}

/**
 * 4. Automated Password / PIN Reset Email
 */
export async function sendPasswordResetEmail(resetData: {
  toEmail: string;
  userName: string;
  storeName?: string;
  newPinOrPassword: string;
  portalUrl?: string;
}) {
  if (!resetData.toEmail || !resetData.toEmail.includes('@')) return;

  const url = resetData.portalUrl || 'https://mbiinventra.com';
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 25px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #e11d48, #f43f5e); padding: 22px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800;">Password & PIN Reset Notification</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">${resetData.storeName || 'MBI INVENTRA Security'}</p>
        </div>
        <div style="padding: 22px;">
          <p style="font-size: 14px; color: #334155;">Hello <strong>${resetData.userName}</strong>,</p>
          <p style="font-size: 13px; color: #334155;">
            Your account credentials have been reset by your store administrator or via security request.
          </p>
          <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 15px; margin: 15px 0; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9f1239; font-weight: bold; text-transform: uppercase;">Your Updated Login Credentials</p>
            <p style="margin: 6px 0 0 0; font-size: 24px; font-family: monospace; font-weight: 900; color: #e11d48; letter-spacing: 2px;">${resetData.newPinOrPassword}</p>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${url}" style="background-color: #e11d48; color: white; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">Login to Your Account</a>
          </div>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8;">
          MBI INVENTRA Cloud ERP • Sargodha, Punjab, Pakistan
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: resetData.toEmail,
    subject: `[MBI INVENTRA Security] Your Credentials Have Been Reset`,
    html
  });
}

/**
 * 4b. Automated Password Reset OTP Verification Email
 */
export async function sendPasswordResetOtpEmail(otpData: {
  toEmail: string;
  userName: string;
  otpCode: string;
  expiresMinutes?: number;
}) {
  if (!otpData.toEmail || !otpData.toEmail.includes('@')) return { success: false, error: 'Invalid email address' };

  const validity = otpData.expiresMinutes || 15;
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 25px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 25px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800;">🔐 Password Recovery Code</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">MBI INVENTRA Cloud POS & ERP Security</p>
        </div>
        <div style="padding: 25px;">
          <p style="font-size: 14px; color: #334155; margin-top: 0;">Hello <strong>${otpData.userName}</strong>,</p>
          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            We received a request to reset your password for your MBI INVENTRA workspace account. Please use the following 6-digit verification code to proceed:
          </p>
          
          <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #1e40af; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Your 6-Digit Verification Code</p>
            <p style="margin: 8px 0 0 0; font-size: 34px; font-family: monospace; font-weight: 900; color: #1d4ed8; letter-spacing: 6px;">${otpData.otpCode}</p>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #64748b;">(Valid for ${validity} minutes)</p>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8;">
          MBI INVENTRA Security Engine • Need help? Contact +92 328 1302636 / +92 336 4585863
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: otpData.toEmail,
    subject: `🔐 [MBI INVENTRA] Password Recovery Code: ${otpData.otpCode}`,
    html
  });
}


/**
 * 5. Custom Announcement / Broadcast / Notice Email to Tenant(s)
 */
export async function sendCustomTenantEmail(payload: {
  toEmail: string | string[];
  storeName?: string;
  recipientName?: string;
  subject: string;
  message: string;
  priority?: 'normal' | 'high' | 'urgent';
  badgeText?: string;
  actionButtonText?: string;
  actionButtonUrl?: string;
}) {
  const recipients = Array.isArray(payload.toEmail)
    ? payload.toEmail.filter(e => e && e.includes('@'))
    : [payload.toEmail].filter(e => e && e.includes('@'));

  if (recipients.length === 0) {
    return { success: false, error: 'No valid recipient email provided.' };
  }

  const badgeColor = payload.priority === 'urgent'
    ? '#dc2626' // red
    : payload.priority === 'high'
    ? '#d97706' // amber
    : '#2563eb'; // royal blue

  const badgeTitle = payload.badgeText || (
    payload.priority === 'urgent' ? '⚠️ URGENT NOTIFICATION' :
    payload.priority === 'high' ? '⭐ IMPORTANT NOTICE' : '📢 OFFICIAL ANNOUNCEMENT'
  );

  // Format message lines into HTML paragraphs
  const messageHtml = payload.message
    .split('\n\n')
    .map(para => `<p style="font-size: 14px; color: #334155; line-height: 1.65; margin: 0 0 14px 0;">${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${payload.subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 620px; margin: 25px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
        
        <!-- Brand Header with Logo & Gradient Theme -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e3a8a 100%); padding: 30px 24px; text-align: center; color: #ffffff; border-bottom: 3px solid rgba(59, 130, 246, 0.4);">
          <table align="center" style="margin: 0 auto; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle; padding-right: 12px;">
                <div style="background: linear-gradient(135deg, #2563eb, #00d2ff); width: 44px; height: 44px; border-radius: 12px; display: inline-block; text-align: center; line-height: 44px; color: #ffffff; font-weight: 900; font-size: 18px; box-shadow: 0 4px 12px rgba(0, 210, 255, 0.35);">
                  M4
                </div>
              </td>
              <td style="vertical-align: middle; text-align: left;">
                <div style="font-size: 22px; font-weight: 900; letter-spacing: 0.5px; color: #ffffff; line-height: 1.1;">
                  MBI <span style="color: #00d2ff;">INVENTRA</span>
                </div>
                <div style="font-size: 10px; font-weight: 700; color: #93c5fd; letter-spacing: 1.5px; text-transform: uppercase;">
                  Cloud POS &amp; Pharmacy ERP
                </div>
              </td>
            </tr>
          </table>

          <div style="margin-top: 18px;">
            <span style="display: inline-block; background-color: ${badgeColor}; color: #ffffff; padding: 5px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
              ${badgeTitle}
            </span>
          </div>

          <h1 style="margin: 14px 0 0 0; font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; line-height: 1.35;">
            ${payload.subject}
          </h1>

          ${payload.storeName ? `
            <div style="margin: 8px 0 0 0; font-size: 12px; color: #cbd5e1;">
              Delivered To: <strong style="color: #ffffff;">${payload.storeName}</strong>
            </div>
          ` : ''}
        </div>

        <!-- Main Content Body -->
        <div style="padding: 28px 26px;">
          ${payload.recipientName ? `
            <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
              Respected ${payload.recipientName},
            </p>
          ` : ''}

          <div style="background: #ffffff; border-left: 4px solid ${badgeColor}; padding-left: 16px; margin: 12px 0 22px 0;">
            ${messageHtml}
          </div>

          ${payload.actionButtonText && payload.actionButtonUrl ? `
            <div style="text-align: center; margin: 28px 0;">
              <a href="${payload.actionButtonUrl}" target="_blank" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); letter-spacing: 0.2px;">
                ${payload.actionButtonText}
              </a>
            </div>
          ` : ''}

          <!-- 24/7 Dedicated Helpline Box -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-top: 28px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle;">
                  <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 3px;">
                    💬 24/7 Dedicated WhatsApp Support Desks
                  </div>
                  <div style="font-size: 11px; color: #64748b;">
                    Engineering &amp; billing assistance is available anytime for your pharmacy counters.
                  </div>
                </td>
                <td style="vertical-align: middle; text-align: right; white-space: nowrap;">
                  <a href="https://wa.me/923364585863" target="_blank" style="display: inline-block; background-color: #25d366; color: #ffffff; font-size: 11px; font-weight: 800; text-decoration: none; padding: 6px 12px; border-radius: 8px; margin-left: 6px;">
                    WhatsApp 1
                  </a>
                  <a href="https://wa.me/923281302636" target="_blank" style="display: inline-block; background-color: #25d366; color: #ffffff; font-size: 11px; font-weight: 800; text-decoration: none; padding: 6px 12px; border-radius: 8px; margin-left: 4px;">
                    WhatsApp 2
                  </a>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Compliance & Professional Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
          <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">
            MBI INVENTRA Cloud ERP • Master Server Communication System
          </p>
          <p style="margin: 0; color: #94a3b8;">
            Sargodha, Punjab, Pakistan • Official Helpline: +92 336 4585863 / +92 328 1302636
          </p>
          <p style="margin: 8px 0 0 0; font-size: 10px; color: #94a3b8;">
            This is a verified transactional message from your MBI INVENTRA server. To manage your communication preferences, visit your master portal.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: recipients,
    subject: payload.subject,
    html
  });
}


