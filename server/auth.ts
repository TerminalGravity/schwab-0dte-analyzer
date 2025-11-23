import type { TokenStore, SchwabTokenResponse } from './types/schwab';

// In-memory token storage (in production, use a database or encrypted file)
const tokenStore: TokenStore = {
  access_token: null,
  refresh_token: null,
  expires_at: null,
};

// In-memory state storage for OAuth (maps state to timestamp)
const stateStore = new Map<string, number>();

// Clean up expired states (older than 10 minutes)
setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [state, timestamp] of stateStore.entries()) {
    if (timestamp < tenMinutesAgo) {
      stateStore.delete(state);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

export class SchwabAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private authBaseUrl = 'https://api.schwabapi.com/v1/oauth';

  constructor() {
    this.clientId = process.env.SCHWAB_CLIENT_ID || '';
    this.clientSecret = process.env.SCHWAB_CLIENT_SECRET || '';
    this.redirectUri = process.env.SCHWAB_REDIRECT_URI || '';

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      console.warn('⚠️  Schwab API credentials not configured. Please set environment variables.');
    }
  }

  /**
   * Generate a random state string for OAuth security
   */
  generateState(): string {
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    stateStore.set(state, Date.now());
    return state;
  }

  /**
   * Verify that a state string is valid and hasn't expired
   */
  verifyState(state: string): boolean {
    const timestamp = stateStore.get(state);
    if (!timestamp) return false;

    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    if (timestamp < tenMinutesAgo) {
      stateStore.delete(state);
      return false;
    }

    stateStore.delete(state); // Use once and delete
    return true;
  }

  /**
   * Get the authorization URL for initiating OAuth flow
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      response_type: 'code',
    });

    return `${this.authBaseUrl}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<SchwabTokenResponse> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${this.authBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const data: SchwabTokenResponse = await response.json();
    this.storeTokens(data);
    return data;
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<SchwabTokenResponse> {
    if (!tokenStore.refresh_token) {
      throw new Error('No refresh token available');
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${this.authBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenStore.refresh_token,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data: SchwabTokenResponse = await response.json();
    this.storeTokens(data);
    return data;
  }

  /**
   * Store tokens in memory with expiration time
   */
  private storeTokens(tokenResponse: SchwabTokenResponse): void {
    tokenStore.access_token = tokenResponse.access_token;
    tokenStore.refresh_token = tokenResponse.refresh_token;
    // Set expiration to 5 minutes before actual expiry for safety
    tokenStore.expires_at = Date.now() + (tokenResponse.expires_in - 300) * 1000;

    console.log('✓ Tokens stored successfully');
    console.log(`  Expires at: ${new Date(tokenStore.expires_at).toLocaleString()}`);
  }

  /**
   * Get the current access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (tokenStore.access_token && tokenStore.expires_at && Date.now() < tokenStore.expires_at) {
      return tokenStore.access_token;
    }

    // Try to refresh the token
    if (tokenStore.refresh_token) {
      console.log('⟳ Access token expired, refreshing...');
      try {
        const tokenResponse = await this.refreshAccessToken();
        return tokenResponse.access_token;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        throw new Error('Token refresh failed. Please re-authenticate.');
      }
    }

    throw new Error('No valid access token. Please authenticate first.');
  }

  /**
   * Check if we have valid credentials
   */
  isAuthenticated(): boolean {
    return !!(tokenStore.access_token && tokenStore.expires_at && Date.now() < tokenStore.expires_at);
  }

  /**
   * Get token expiration info
   */
  getTokenInfo(): { isAuthenticated: boolean; expiresAt: number | null; expiresIn: number | null } {
    const isAuthenticated = this.isAuthenticated();
    const expiresAt = tokenStore.expires_at;
    const expiresIn = expiresAt ? Math.floor((expiresAt - Date.now()) / 1000) : null;

    return {
      isAuthenticated,
      expiresAt,
      expiresIn,
    };
  }

  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    tokenStore.access_token = null;
    tokenStore.refresh_token = null;
    tokenStore.expires_at = null;
    console.log('✓ Tokens cleared');
  }
}
