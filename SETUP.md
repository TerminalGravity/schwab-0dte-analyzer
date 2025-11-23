# Schwab 0DTE Analyzer - Setup Guide

This guide will help you set up the Schwab 0DTE Options Analyzer with full OAuth authentication.

## Prerequisites

- Bun runtime (v1.0+)
- Schwab brokerage account
- Schwab Developer Account

## Step 1: Get Schwab API Credentials

1. **Create a Schwab Developer Account**
   - Go to [Schwab Developer Portal](https://developer.schwab.com/)
   - Sign in with your Schwab brokerage account credentials
   - Complete the developer registration

2. **Create a New App**
   - Navigate to "My Apps" in the developer portal
   - Click "Create New App"
   - Fill in the application details:
     - **App Name**: Schwab 0DTE Analyzer (or any name you prefer)
     - **App Description**: Personal 0DTE options analysis tool
     - **Callback URL**: `http://localhost:3000/api/auth/callback`
   - Submit the application

3. **Get Your Credentials**
   - After app creation, you'll receive:
     - **Client ID** (also called App Key)
     - **Client Secret** (also called Secret)
   - Copy these values - you'll need them in the next step

## Step 2: Configure Environment Variables

1. Open the `.env` file in the project root

2. Update the following values:
   ```env
   SCHWAB_CLIENT_ID=your_client_id_here
   SCHWAB_CLIENT_SECRET=your_client_secret_here
   SCHWAB_REDIRECT_URI=http://localhost:3000/api/auth/callback

   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   SESSION_SECRET=change_this_to_a_random_string_in_production
   ```

3. Replace:
   - `your_client_id_here` with your actual Client ID
   - `your_client_secret_here` with your actual Client Secret
   - `change_this_to_a_random_string_in_production` with a random string (at least 32 characters)

## Step 3: Install Dependencies

```bash
bun install
```

## Step 4: Start the Application

### Terminal 1: Start the Backend Server

```bash
bun run dev:server
```

You should see output like:
```
🚀 Starting Schwab 0DTE Analyzer Backend...

Environment:
  PORT: 3000
  FRONTEND_URL: http://localhost:5173
  NODE_ENV: development

Endpoints:
  Health: http://localhost:3000/health
  Auth Login: http://localhost:3000/api/auth/login
  ...
```

### Terminal 2: Start the Frontend

```bash
bun run dev
```

You should see:
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## Step 5: Authenticate with Schwab

1. **Initiate OAuth Flow**
   - Open your browser and go to: `http://localhost:3000/api/auth/login`
   - You'll see a JSON response with an `authUrl`
   - Copy the `authUrl` value

2. **Authorize the Application**
   - Paste the `authUrl` in your browser
   - You'll be redirected to Schwab's authorization page
   - Log in with your Schwab account credentials
   - Review the permissions and click "Authorize" or "Allow"

3. **Complete Authentication**
   - After authorizing, you'll be redirected back to `http://localhost:3000/api/auth/callback`
   - You should see a success message: "✓ Authentication Successful!"
   - The page will automatically redirect to the frontend app

4. **Verify Authentication**
   - Check auth status: `http://localhost:3000/api/auth/status`
   - You should see `"isAuthenticated": true`

## Step 6: Use the Application

1. Open the frontend at `http://localhost:5173`
2. Enter a stock symbol (e.g., SPY, QQQ, AAPL)
3. Click "Analyze" to fetch 0DTE options data
4. View:
   - Max pain level
   - Put/Call ratio
   - Volume analysis
   - Options chain with calls and puts
   - Volume charts

## API Endpoints

### Authentication
- `GET /api/auth/login` - Get authorization URL
- `GET /api/auth/callback` - OAuth callback (automatic)
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/logout` - Clear stored tokens

### Market Data (requires authentication)
- `GET /api/schwab/chain/:symbol` - Get options chain
- `GET /api/schwab/quote/:symbol` - Get real-time quote
- `GET /api/schwab/pricehistory/:symbol` - Get price history

### Health Check
- `GET /health` - Server health check

## Token Management

- Access tokens expire after 30 minutes
- The backend automatically refreshes tokens using the refresh token
- Refresh tokens are valid for 7 days
- After 7 days, you'll need to re-authenticate through the OAuth flow

## Troubleshooting

### "No valid access token" error
- Solution: Go to `http://localhost:3000/api/auth/login` and re-authenticate

### "Failed to refresh token" error
- Your refresh token has expired (after 7 days)
- Solution: Re-authenticate through the OAuth flow

### CORS errors
- Make sure both backend (port 3000) and frontend (port 5173) are running
- Verify `FRONTEND_URL` in `.env` matches your frontend URL

### "Invalid redirect URI" error
- Verify the redirect URI in your Schwab app settings matches: `http://localhost:3000/api/auth/callback`
- Make sure `SCHWAB_REDIRECT_URI` in `.env` is correct

### Options chain returns no data
- Verify the symbol is valid
- Check market hours (options data may be limited outside trading hours)
- Try a different symbol (SPY is usually reliable)

## Development Tips

1. **Auto-refresh**: Enable the "Auto-refresh (30s)" toggle in the frontend to automatically update data

2. **Watch mode**: Both frontend and backend support watch mode for development:
   - Frontend: `bun run dev` (already in watch mode)
   - Backend: `bun run dev:server` (uses `--watch` flag)

3. **Production build**:
   ```bash
   bun run build
   bun run server
   ```

4. **Check logs**: Backend logs show all API requests and responses for debugging

## Security Notes

- Never commit `.env` to version control (it's already in `.gitignore`)
- Use a strong `SESSION_SECRET` in production
- Tokens are stored in memory and will be lost on server restart
- For production, consider using a database or encrypted file storage for tokens

## Next Steps

- Explore different symbols and strike ranges
- Monitor max pain levels throughout the trading day
- Compare put/call ratios across different symbols
- Use volume analysis to identify unusual activity

Happy trading!
