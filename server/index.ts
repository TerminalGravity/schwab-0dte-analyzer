import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { SchwabAuth } from './auth';
import schwabRoutes from './routes/schwab';

const app = new Hono();
const auth = new SchwabAuth();

// Environment variables
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware: Logging
app.use('*', logger());

// Middleware: CORS
app.use('*', cors({
  origin: [FRONTEND_URL, 'http://localhost:5173'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * OAuth: Initiate authentication flow
 * GET /api/auth/login
 */
app.get('/api/auth/login', (c) => {
  const state = auth.generateState();
  const authUrl = auth.getAuthorizationUrl(state);

  console.log('→ Initiating OAuth flow');
  console.log(`  Authorization URL: ${authUrl}`);

  return c.json({
    authUrl,
    message: 'Please visit the authUrl to authorize the application',
  });
});

/**
 * OAuth: Handle callback from Schwab
 * GET /api/auth/callback
 */
app.get('/api/auth/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (!code || !state) {
      return c.html(`
        <html>
          <body style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">❌ Authentication Failed</h1>
            <p>Missing authorization code or state parameter.</p>
            <a href="${FRONTEND_URL}" style="color: #3b82f6;">Return to App</a>
          </body>
        </html>
      `, 400);
    }

    // Verify state to prevent CSRF attacks
    if (!auth.verifyState(state)) {
      return c.html(`
        <html>
          <body style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">❌ Authentication Failed</h1>
            <p>Invalid or expired state parameter. Please try again.</p>
            <a href="${FRONTEND_URL}" style="color: #3b82f6;">Return to App</a>
          </body>
        </html>
      `, 400);
    }

    console.log('→ Processing OAuth callback');

    // Exchange authorization code for access token
    const tokenResponse = await auth.exchangeCodeForToken(code);

    console.log('✓ Authentication successful');

    // Return success page with auto-redirect
    return c.html(`
      <html>
        <head>
          <meta http-equiv="refresh" content="3;url=${FRONTEND_URL}" />
        </head>
        <body style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; text-align: center;">
          <h1 style="color: #22c55e;">✓ Authentication Successful!</h1>
          <p>You have been successfully authenticated with Schwab.</p>
          <p style="color: #64748b;">Redirecting to the app in 3 seconds...</p>
          <a href="${FRONTEND_URL}" style="color: #3b82f6; text-decoration: none; padding: 0.5rem 1rem; border: 1px solid #3b82f6; border-radius: 0.375rem; display: inline-block; margin-top: 1rem;">Return to App Now</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);

    return c.html(`
      <html>
        <body style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">❌ Authentication Failed</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          <a href="${FRONTEND_URL}" style="color: #3b82f6;">Return to App</a>
        </body>
      </html>
    `, 500);
  }
});

/**
 * OAuth: Check authentication status
 * GET /api/auth/status
 */
app.get('/api/auth/status', (c) => {
  const tokenInfo = auth.getTokenInfo();

  return c.json({
    isAuthenticated: tokenInfo.isAuthenticated,
    expiresAt: tokenInfo.expiresAt,
    expiresIn: tokenInfo.expiresIn,
    expiresInMinutes: tokenInfo.expiresIn ? Math.floor(tokenInfo.expiresIn / 60) : null,
  });
});

/**
 * OAuth: Logout and clear tokens
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', (c) => {
  auth.clearTokens();
  return c.json({ message: 'Logged out successfully' });
});

// Mount Schwab API routes
app.route('/api/schwab', schwabRoutes);

/**
 * 404 handler
 */
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

/**
 * Error handler
 */
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

/**
 * Start the server
 */
console.log('\n🚀 Starting Schwab 0DTE Analyzer Backend...\n');
console.log('Environment:');
console.log(`  PORT: ${PORT}`);
console.log(`  FRONTEND_URL: ${FRONTEND_URL}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log('\nEndpoints:');
console.log(`  Health: http://localhost:${PORT}/health`);
console.log(`  Auth Login: http://localhost:${PORT}/api/auth/login`);
console.log(`  Auth Status: http://localhost:${PORT}/api/auth/status`);
console.log(`  Options Chain: http://localhost:${PORT}/api/schwab/chain/:symbol`);
console.log(`  Quote: http://localhost:${PORT}/api/schwab/quote/:symbol`);
console.log(`  Price History: http://localhost:${PORT}/api/schwab/pricehistory/:symbol`);
console.log('\n');

export default {
  port: PORT,
  fetch: app.fetch,
};
