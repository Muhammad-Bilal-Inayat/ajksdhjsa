import { getSystemHWIDSync } from '../lib/hardwareFingerprint';
import { saveTenant } from '../lib/masterServerService';

export interface LoginCredentials {
  identifier: string; // Username, Email, or Mobile Phone
  password?: string;
  passcode?: string;
  rememberMe?: boolean;
}

export interface RegisterPharmacyParams {
  storeName: string;
  ownerName: string;
  username: string;
  phone: string;
  city?: string;
  email?: string;
  password: string;
  plan?: string;
  hwid?: string;
  deviceId?: string;
  deviceModel?: string;
  os?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    userId: string;
    tenantId: string;
    role: string;
    name: string;
    fullName?: string;
    email?: string;
    firmId?: string;
    isPrimaryAdmin?: boolean;
    hwid?: string;
  };
  error?: string;
  message?: string;
  features?: Record<string, boolean>;
}

export const authService = {
  /**
   * Universal 3-in-1 Login
   * Accepts username, email address, or mobile phone (e.g., 0328-1302636)
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const identifier = credentials.identifier.trim();
    const passcode = credentials.password || credentials.passcode || '0000';
    const currentHwid = getSystemHWIDSync();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email_or_phone: identifier,
          passcode: passcode,
          password: passcode,
          hwid: currentHwid,
          deviceId: currentHwid
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        if (credentials.rememberMe) {
          try {
            localStorage.setItem('mbi_remember_identifier', identifier);
          } catch {}
        } else {
          try {
            localStorage.removeItem('mbi_remember_identifier');
          } catch {}
        }
        try {
          localStorage.setItem('mbi_jwt_token', data.token);
          localStorage.setItem('mbi_bound_hwid', currentHwid);
        } catch {}
        return {
          success: true,
          token: data.token,
          user: data.user
        };
      }

      return {
        success: false,
        error: data.error || 'Invalid credentials or inactive account'
      };
    } catch (err: any) {
      console.warn('[AUTH SERVICE LOGIN ERROR]', err);
      return {
        success: false,
        error: err.message || 'Unable to connect to server. Please check your network.'
      };
    }
  },

  /**
   * Dynamic Pharmacy Store Registration
   * Creates tenant record, primary admin user, and initializes free trial
   */
  async registerPharmacy(params: RegisterPharmacyParams): Promise<AuthResponse> {
    const clientHwid = params.hwid || getSystemHWIDSync();
    try {
      localStorage.setItem('mbi_bound_hwid', clientHwid);
    } catch {}

    try {
      const response = await fetch('/api/auth/register-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeName: params.storeName.trim(),
          ownerName: params.ownerName.trim(),
          username: params.username.trim(),
          city: (params.city || 'Sargodha').trim(),
          phone: params.phone.trim(),
          email: params.email ? params.email.trim() : undefined,
          password: params.password.trim(),
          plan: params.plan || 'Basic',
          hwid: clientHwid,
          deviceId: params.deviceId || clientHwid,
          deviceModel: params.deviceModel,
          os: params.os
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const effectiveStoreName = data.storeName || params.storeName.trim();
        const effectiveTenantId = data.tenantId || `tenant_${Date.now()}`;
        const effectiveUserId = data.userId || `usr_${Date.now()}`;
        const effectivePlan = 'Basic';
        const trialExpiry = data.trialExpiresAt || new Date(Date.now() + 10 * 86400000).toISOString();

        // 1. Set Auth & Session Tokens
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('mbi_auth_token', data.token);
          localStorage.setItem('mbi_jwt_token', data.token);
        }
        localStorage.setItem('mbi_bound_hwid', clientHwid);
        localStorage.setItem('mbi_active_tenant_id', effectiveTenantId);
        localStorage.setItem('tenant_id', effectiveTenantId);
        localStorage.setItem('mbi_active_business_id', effectiveTenantId);
        localStorage.setItem('mbi_user_role', 'Primary Admin');
        localStorage.setItem('mbi_active_plan_tier', 'Basic');
        localStorage.setItem('mbi_plan', 'Basic');
        localStorage.setItem('mbi_subscription_tier', 'Basic');
        localStorage.setItem('mbi_trial_expires_at', trialExpiry);

        // 2. Build and save Session & User Profile
        const userObj = {
          uid: effectiveUserId,
          userId: effectiveUserId,
          id: effectiveUserId,
          tenantId: effectiveTenantId,
          email: params.email ? params.email.trim() : `${params.username || params.phone || 'user'}@inventra.local`,
          displayName: params.ownerName || params.username || effectiveStoreName,
          name: params.ownerName || params.username || effectiveStoreName,
          role: 'Primary Admin',
          storeName: effectiveStoreName,
          phone: params.phone.trim(),
          plan: 'Basic',
          isPrimaryAdmin: true,
          isPrimaryOwner: true
        };
        localStorage.setItem('mock_session', JSON.stringify(userObj));

        const userProfile = {
          id: effectiveUserId,
          email: userObj.email,
          name: userObj.name,
          role: 'Admin',
          pin: params.password.trim(),
          businessId: effectiveTenantId,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('mock_user_profile', JSON.stringify(userProfile));

        // 3. Build and save Business Profile with exact company name
        const newBusiness = {
          id: effectiveTenantId,
          tenantId: effectiveTenantId,
          name: effectiveStoreName,
          ownerUid: effectiveUserId,
          members: [effectiveUserId],
          phone: params.phone.trim(),
          mobile: params.phone.trim(),
          email: userObj.email,
          website: '',
          address: `${params.city || 'Lahore'}, Pakistan`,
          city: params.city || 'Lahore',
          state: 'Punjab',
          pincode: '54000',
          taxNumber: '',
          drugLicenseNo: '',
          businessType: 'Retail Pharmacy & General Store',
          currency: 'PKR',
          vatPercentage: 0,
          invoiceTerms: '1. Goods once sold will not be returned without original invoice.\n2. Warranty claims require invoice copy.',
          invoicePrefix: (effectiveStoreName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'INV') + '-',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('mock_business', JSON.stringify(newBusiness));
        localStorage.setItem('mbi_user_businesses', JSON.stringify([newBusiness]));

        // 4. Build and save Tenant Cache (Strict 10-Day Basic Trial)
        const tenantObj = {
          id: effectiveTenantId,
          tenantId: effectiveTenantId,
          organizationId: `org_${effectiveTenantId}`,
          licenseId: data.licenseId || `lic_${effectiveTenantId}`,
          name: effectiveStoreName,
          ownerName: userObj.name,
          ownerEmail: userObj.email,
          ownerPhone: params.phone.trim(),
          city: params.city || 'Lahore',
          address: `${params.city || 'Lahore'}, Pakistan`,
          plan: 'Basic',
          status: 'Active',
          trialStartDate: new Date().toISOString(),
          trialExpiryDate: trialExpiry,
          isTrialActive: true,
          trialExpired: false,
          paidLicenseActive: false,
          maxDevices: 1,
          maxUsers: 5,
          features: data.features || {}
        };
        localStorage.setItem('mbi_active_tenant_cache', JSON.stringify(tenantObj));

        // 5. Update local master tenants catalog in localStorage & sync to master server fleet
        try {
          saveTenant(tenantObj as any);
        } catch (e) {}

        try {
          const rawTenants = localStorage.getItem('mbi_master_tenants_v2');
          let tenantsList = rawTenants ? JSON.parse(rawTenants) : [];
          if (!Array.isArray(tenantsList)) tenantsList = [];
          tenantsList = tenantsList.filter((t: any) => t.id !== effectiveTenantId && t.tenantId !== effectiveTenantId);
          tenantsList.unshift(tenantObj);
          localStorage.setItem('mbi_master_tenants_v2', JSON.stringify(tenantsList));
          localStorage.setItem('mbi_master_tenants_v1', JSON.stringify(tenantsList));
          localStorage.setItem('mbi_master_tenants_v3', JSON.stringify(tenantsList));
          localStorage.setItem('mbi_master_tenants', JSON.stringify(tenantsList));
        } catch (e) {}

        // 6. Update general settings with exact store name
        try {
          const savedSettingsStr = localStorage.getItem('pharma_app_settings');
          const currentSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : {};
          const updatedSettings = {
            ...currentSettings,
            general: {
              ...(currentSettings.general || {}),
              companyName: effectiveStoreName,
              storeName: effectiveStoreName,
              phone: params.phone.trim(),
              email: userObj.email,
              city: params.city || 'Lahore'
            },
            print: {
              ...(currentSettings.print || {}),
              companyName: effectiveStoreName,
              phone: params.phone.trim()
            }
          };
          localStorage.setItem('pharma_app_settings', JSON.stringify(updatedSettings));
        } catch (e) {}

        // 7. Dispatch events for instantaneous reactive UI update
        window.dispatchEvent(new CustomEvent('mbi-auth-changed', { detail: { user: userObj, tenant: tenantObj } }));
        window.dispatchEvent(new CustomEvent('mbi-business-updated', { detail: newBusiness }));
        window.dispatchEvent(new CustomEvent('mbi-tenant-updated', { detail: tenantObj }));
        window.dispatchEvent(new CustomEvent('mbi-plan-updated', { detail: { plan: 'Basic', trialExpiresAt: trialExpiry } }));
        window.dispatchEvent(new CustomEvent('saas-plans-updated'));
        window.dispatchEvent(new Event('storage'));

        return {
          success: true,
          token: data.token,
          user: data.user || userObj,
          message: data.message || 'Pharmacy registered successfully!'
        };
      }

      return {
        success: false,
        error: data.error || 'Registration failed. Please check your inputs.'
      };
    } catch (err: any) {
      console.warn('[AUTH SERVICE REGISTRATION ERROR]', err);
      return {
        success: false,
        error: err.message || 'Network error during registration.'
      };
    }
  }
};
