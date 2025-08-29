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

export type NewPassword = {
  old_pwd: string;
  new_pwd: string;
  new_pwd_confirmation: string;
};

class AuthClient {
  private client: AuthServiceClient;

  constructor() {
    const channel = createChannel(
      process.env.NEXT_PUBLIC_API_URL!,
      FetchTransport({ credentials: 'include' }),
    );
    this.client = createClient(AuthServiceDefinition, channel);
  }

  async login(email: string, password: string): Promise<{token: string, refresh: string}> {
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
    console.log('listPermissionsRequest', request);
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
    const accessToken = identity.accessToken;
    const refreshToken = identity.refreshToken;
    const accessTokenExpiry = localStorage.getItem('accessTokenExpiry');

    if (
      !!accessTokenExpiry &&
      currentDateTimestamp > +accessTokenExpiry! - 30
    ) {
      if (!refreshToken) {
        console.error('No refresh token available');
        return null;
      }

      try {
        const refreshTokenResponse = await this.client.refresh({
          token: accessToken,
          refresh: refreshToken,
        });
        setTokenValue(refreshTokenResponse.token, refreshTokenResponse.refresh);
        return refreshTokenResponse.token;
      } catch (err) {
        console.log('refreshTokenError', err);
        return null;
      }
    }

    return accessToken;
  }
}

export const authClient = new AuthClient();
