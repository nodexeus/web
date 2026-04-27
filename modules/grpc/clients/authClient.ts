import {
  AuthServiceClient,
  AuthServiceDefinition,
} from '../library/blockjoy/v1/auth';
import {
  createChannel,
  createClient,
  FetchTransport,
  Metadata,
} from 'nice-grpc-web';
import {
  getIdentity,
  getOptions,
  handleError,
  setTokenValue,
} from '@modules/grpc';
import { debugLog } from '@/lib/debug';

export type NewPassword = {
  old_pwd: string;
  new_pwd: string;
  new_pwd_confirmation: string;
};

class AuthClient {
  private client: AuthServiceClient;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    const channel = createChannel(
      process.env.NEXT_PUBLIC_API_URL!,
      FetchTransport({ credentials: 'include' }),
    );
    this.client = createClient(AuthServiceDefinition, channel);
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; refresh: string }> {
    try {
      const response = await this.client.login({
        email,
        password,
      });
      setTokenValue(response.token, response.refresh);
      return { token: response.token, refresh: response.refresh };
    } catch (err) {
      return handleError(err);
    }
  }

  async registrationConfirmation(token: string): Promise<string> {
    const authHeader = {
      metadata: Metadata({
        authorization: `Bearer ${token}`,
      }),
    };
    try {
      const response = await this.client.confirm({}, authHeader);
      setTokenValue(response.token, response.refresh);
      return response.token;
    } catch (err) {
      return handleError(err);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await this.client.resetPassword({ email }, getOptions());
    } catch (err) {
      return handleError(err);
    }
  }

  async listPermissions(userId: string, orgId: string): Promise<string[]> {
    const request = { userId, orgId, includeToken: true };
    debugLog('listPermissionsRequest', request);
    try {
      await this.refreshToken();
      const response = await this.client.listPermissions(request, getOptions());
      return response.permissions;
    } catch (err) {
      return handleError(err);
    }
  }

  async updateResetPassword(token: string, password: string): Promise<void> {
    const authHeader = {
      metadata: Metadata({
        authorization: `Bearer ${token}`,
      }),
    };
    try {
      await this.client.updatePassword({ password }, authHeader);
    } catch (err) {
      return handleError(err, false);
    }
  }

  async updatePassword(pwd: NewPassword): Promise<void> {
    try {
      await this.refreshToken();
      await this.client.updateUIPassword(
        {
          oldPassword: pwd.old_pwd,
          newPassword: pwd.new_pwd,
          userId: getIdentity().userId,
        },
        getOptions(),
      );
    } catch (err) {
      return handleError(err);
    }
  }

  async refreshToken(): Promise<string | null> {
    const currentDateTimestamp = Math.round(new Date().getTime() / 1000);
    const identity = getIdentity();

    // Derive expiry from the token itself — don't trust the separately cached value
    let accessTokenExpiry: number | null = null;
    try {
      const payload = identity.accessToken?.split('.')[1];
      if (payload) {
        accessTokenExpiry = JSON.parse(atob(payload)).exp;
      }
    } catch {
      // If we can't decode, force a refresh
      accessTokenExpiry = 0;
    }

    // If token is still valid, return it
    if (accessTokenExpiry && currentDateTimestamp <= accessTokenExpiry - 30) {
      return identity.accessToken;
    }

    // If a refresh is already in-flight, wait for it
    if (this.refreshPromise) return this.refreshPromise;

    // Start a new refresh
    this.refreshPromise = this._doRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async _doRefresh(): Promise<string | null> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // sends httpOnly cookies
      });

      if (!response.ok) {
        // Refresh failed — session is dead
        localStorage.removeItem('identity');
        window.location.href = '/login';
        return null;
      }

      const data = await response.json();
      if (data.accessToken) {
        setTokenValue(data.accessToken);
        return data.accessToken;
      }

      return null;
    } catch (err) {
      console.error('Token refresh failed');
      localStorage.removeItem('identity');
      window.location.href = '/login';
      return null;
    }
  }
}

export const authClient = new AuthClient();
