# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A real-time 0DTE (zero days to expiration) options analysis system for SPY, QQQ, and SPX. The application consists of:
- **Frontend**: React + Vite application with lightweight-charts for visualization
- **Backend**: Bun + Hono API server with Schwab API integration
- **AI Orchestration**: Multi-model AI system using GPT-5 and Gemini-3-Pro for trade analysis
- **Data Layer**: Supabase for storage and historical analysis

## Development Commands

### Running the Application

The application requires two separate processes:

```bash
# Terminal 1: Backend server (Hono on port 3000/3001)
bun run dev:server

# Terminal 2: Frontend dev server (Vite on port 5173)
bun run dev
```

### Other Commands

```bash
# Build frontend for production
bun run build

# Run backend in production mode
bun run server

# Lint code
bun run lint

# Preview production build
bun run preview
```

## Code Architecture

### Backend Structure (`server/`)

The backend is organized into services, routes, and authentication layers:

**Core Services:**
- `services/ai-orchestrator.ts` - Routes AI tasks to GPT-5 or Gemini-3-Pro based on task type. Uses model-specific strategies (e.g., GPT-5 for financial analysis, Gemini for pattern recognition). Includes fallback logic and ensemble execution for critical predictions.

- `services/data-collector.ts` - Polls SPY/QQQ/SPX options every 1 minute (configurable). Detects "naked positions" when volume > open interest × threshold. Automatically stores all option quotes and Greeks to Supabase.

- `services/credit-spread-analyzer.ts` - Analyzes options chains to identify optimal credit spread opportunities based on risk/reward profiles.

- `services/atm-trade-analyzer.ts` - Analyzes at-the-money options for SPY/QQQ to generate trade signals.

- `services/pnl-calculator.ts` - Calculates profit/loss for trade signals and maintains trading statistics.

- `services/supabase-client.ts` - Centralized Supabase operations for storing options quotes, naked positions, credit spreads, trade signals, and P&L data.

**Authentication:**
- `auth.ts` - Handles Schwab OAuth 2.0 flow, token management, and automatic token refresh. Stores tokens in-memory with state verification for CSRF protection.

**API Routes:**
- `routes/schwab.ts` - Proxies Schwab API calls (options chains, quotes, price history)
- `routes/trading.ts` - Exposes trading analysis endpoints (naked positions, credit spreads, signals, P&L)

**Entry Point:**
- `index.ts` - Hono app with CORS, OAuth endpoints, and route mounting. Prints comprehensive endpoint documentation on startup.

### Frontend Structure (`src/`)

**Components:**
- `components/OptionsMetrics.tsx` - Displays max pain, put/call ratio, and volume statistics
- `components/OptionsTable.tsx` - Two-column options chain table (calls/puts) with Greeks
- `components/VolumeChart.tsx` - Histogram visualization using lightweight-charts
- `components/PriceChart.tsx` - Candlestick charts for price history

**Data Layer:**
- `hooks/useOptionsData.ts` - Custom hook for fetching and managing options data with auto-refresh
- `services/schwabApi.ts` - API client for backend communication

### Key Architectural Patterns

**AI Orchestration Strategy:**
The `AIOrchestrator` class routes tasks to different models based on their strengths:
- GPT-5: Credit spread analysis, risk assessment, portfolio optimization (multi-step reasoning)
- Gemini-3-Pro: Trade prediction, pattern recognition, market sentiment (pattern/visual analysis)
- Fallback chain: If primary model fails, automatically falls back to secondary model
- Ensemble mode: Runs both models in parallel for critical decisions and compares results

**Data Collection Flow:**
1. `DataCollector` polls Schwab API every 60 seconds (configurable)
2. Fetches 0DTE options chains for SPY, QQQ, SPX
3. For each option contract:
   - Stores full quote with Greeks to `options_quotes` table
   - Checks if volume > OI × 1.5 (naked position threshold)
   - If threshold exceeded, stores to `naked_positions` table
4. Analyzers process the stored data to generate credit spreads and trade signals

**OAuth Token Management:**
- Tokens stored in-memory (not persisted to disk)
- State parameter generated for each OAuth flow (CSRF protection)
- Token refresh handled automatically when access token expires
- All Schwab API calls go through `SchwabAuth.getAccessToken()` which handles refresh logic

## Environment Configuration

The application requires multiple API keys and configurations:

**Required:**
- `SCHWAB_CLIENT_ID` / `SCHWAB_CLIENT_SECRET` - Schwab API credentials
- `SCHWAB_REDIRECT_URI` - OAuth callback URL (must match Schwab app config)
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` - Database for historical data

**AI Models (for trade analysis):**
- `OPENAI_API_KEY` / `OPENAI_MODEL` - Defaults to gpt-5
- `GOOGLE_API_KEY` / `GEMINI_MODEL` - Defaults to gemini-3-pro

**Trading Parameters:**
- `TRACKED_SYMBOLS` - Comma-separated symbols (default: SPY,QQQ,SPX)
- `NAKED_POSITION_THRESHOLD` - Volume/OI ratio threshold (default: 1.5)
- `DATA_POLLING_INTERVAL` - Collection interval in ms (default: 60000)

**Other:**
- `PORT` - Backend server port (default: 3000)
- `FRONTEND_URL` - For CORS configuration
- `SESSION_SECRET` - For OAuth state verification

## Working with Types

**Schwab API Types** (`server/types/schwab.ts`):
- `SchwabOptionsChainResponse` - Full options chain response structure
- `OptionContract` - Individual option contract with Greeks
- Response types include nested maps (e.g., `callExpDateMap[date][strike][]`)

**Frontend Types** (`src/types/options.ts`):
- Simplified versions of backend types for UI components
- Includes calculated fields like max pain and put/call ratios

## Common Development Tasks

### Adding a New AI Task Type

1. Add enum to `AITaskType` in `ai-orchestrator.ts`
2. Add model selection strategy in `getModelStrategy()`
3. Call `aiOrchestrator.execute()` with the new task type

### Adding a New Analyzer Service

1. Create service in `server/services/`
2. Implement analysis logic using data from `supabaseService`
3. Store results back to appropriate Supabase table
4. Add endpoint in `routes/trading.ts` to expose results

### Modifying Data Collection

The collection logic is in `services/data-collector.ts`:
- `fetchOptionsChain()` - Adjust API parameters for different option ranges
- `processOptionsChain()` - Add additional processing logic
- `checkNakedPosition()` - Modify detection criteria
- Adjust `POLLING_INTERVAL` and `TRACKED_SYMBOLS` via environment variables

## API Endpoint Reference

### Authentication
- `GET /api/auth/login` - Get OAuth URL
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/status` - Check token status
- `POST /api/auth/logout` - Clear tokens

### Market Data (Proxied to Schwab)
- `GET /api/schwab/chain/:symbol` - Options chain
- `GET /api/schwab/quote/:symbol` - Stock quote
- `GET /api/schwab/pricehistory/:symbol` - Price history

### Trading Analysis
- `GET /api/trading/dashboard` - Comprehensive dashboard data
- `GET /api/trading/naked-positions` - Volume > OI threshold positions
- `GET /api/trading/credit-spreads` - Top credit spread opportunities
- `GET /api/trading/signals` - Active trade signals
- `GET /api/trading/pnl` - P&L summary
- `POST /api/trading/start` - Start data collection
- `POST /api/trading/stop` - Stop data collection
- `POST /api/trading/pnl/calculate` - Manually trigger P&L calculation

## Important Notes

### Schwab API Rate Limits
- Be mindful of rate limits based on your API tier
- Data collector runs every 60 seconds by default - adjust if needed
- Failed requests are logged but don't stop the collection cycle

### 0DTE Options Specificity
- Collection filters for `daysToExpiration: 0` only
- Only available during trading hours on trading days
- Options chains will be empty on non-trading days or after market close

### AI Model Configuration
The `.env.example` references `gpt-5` and `gemini-3-pro` as placeholder SOTA models. When working with this code:
- Update to actual available model IDs (e.g., `gpt-4`, `gemini-pro`)
- Model selection strategy in `ai-orchestrator.ts` determines which model handles each task
- All AI calls are logged to Supabase (`ai_orchestration_log` table) with latency and token metrics

### Database Schema
The application expects Supabase tables:
- `options_quotes` - Time-series option data
- `naked_positions` - Detected high volume/OI ratio positions
- `credit_spreads` - Analyzed spread opportunities
- `trade_signals` - SPY/QQQ trade signals
- `pnl_tracking` - Trade outcomes and statistics
- `ai_orchestration_log` - AI model usage and performance

### Token Management
- OAuth tokens are NOT persisted - server restart requires re-authentication
- Access tokens expire after ~30 minutes (Schwab default)
- Refresh tokens expire after 7 days
- Production deployments should implement token persistence (database, secure storage)
