import { getSystemHWIDSync } from '../lib/hardwareFingerprint';

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
        // Auto-login newly registered user
        const loginRes = await this.login({
          identifier: params.username || params.phone,
          password: params.password,
          rememberMe: true
        });

        if (loginRes.success) {
          return loginRes;
        }

        return {
          success: true,
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
