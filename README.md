# Schwab 0DTE Options Analyzer

A real-time options analysis tool for zero days to expiration (0DTE) options using the Schwab API, built with Bun, Hono, React, Vite, and lightweight-charts.

## Features

- **Real-time Options Data**: Fetch live options chain data via Schwab API
- **0DTE Analysis**: Focused analysis on zero days to expiration options
- **Max Pain Calculation**: Automatically calculate max pain strike levels
- **Volume & Open Interest**: Visualize volume and open interest distribution across strikes
- **Interactive Charts**: Beautiful charts powered by lightweight-charts
- **Put/Call Ratio**: Track put/call volume ratios in real-time
- **Auto-refresh**: Optional auto-refresh functionality for live monitoring

## Tech Stack

### Backend
- **Bun**: Fast JavaScript runtime
- **Hono**: Lightweight web framework
- **TypeScript**: Type-safe development

### Frontend
- **React**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool
- **lightweight-charts**: High-performance charting library
- **Axios**: HTTP client

## Project Structure

```
schwab-0dte-analyzer/
├── server/                 # Backend API server
│   ├── index.ts           # Hono server entry point
│   ├── routes/            # API routes
│   │   └── schwab.ts      # Schwab API endpoints
│   └── types/             # TypeScript types
│       └── schwab.ts      # Schwab API types
├── src/                   # Frontend React app
│   ├── components/        # React components
│   │   ├── OptionsMetrics.tsx
│   │   ├── OptionsTable.tsx
│   │   ├── PriceChart.tsx
│   │   └── VolumeChart.tsx
│   ├── hooks/             # Custom React hooks
│   │   └── useOptionsData.ts
│   ├── services/          # API clients
│   │   └── schwabApi.ts
│   ├── types/             # TypeScript types
│   │   └── options.ts
│   ├── App.tsx            # Main app component
│   └── main.tsx           # App entry point
└── .env.example           # Environment variables template
```

## Prerequisites

- **Bun** (v1.0+)
- **Schwab API Credentials** (Client ID, Client Secret, Access Token)

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Schwab API

1. Copy the environment variables example:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Schwab API credentials:
```env
SCHWAB_CLIENT_ID=your_client_id_here
SCHWAB_CLIENT_SECRET=your_client_secret_here
SCHWAB_ACCESS_TOKEN=your_access_token_here
SCHWAB_REFRESH_TOKEN=your_refresh_token_here
SCHWAB_REDIRECT_URI=http://localhost:3001/api/schwab/auth/callback
PORT=3001
```

### 3. Obtain Schwab API Credentials

1. Register for a Schwab Developer account at https://developer.schwab.com
2. Create a new app to get your Client ID and Client Secret
3. Complete the OAuth flow to obtain an access token
4. Add the credentials to your `.env` file

### 4. Run the Application

You need to run both the backend server and the frontend dev server:

#### Terminal 1 - Start Backend Server
```bash
bun run dev:server
```
The backend will run on http://localhost:3001

#### Terminal 2 - Start Frontend Dev Server
```bash
bun run dev
```
The frontend will run on http://localhost:5173

### 5. Open in Browser

Navigate to http://localhost:5173 and start analyzing 0DTE options!

## Available Scripts

- `bun run dev` - Start Vite development server (frontend)
- `bun run dev:server` - Start Hono server in watch mode (backend)
- `bun run server` - Start Hono server in production mode
- `bun run build` - Build frontend for production
- `bun run preview` - Preview production build
- `bun run lint` - Run ESLint

## API Endpoints

The backend server exposes the following endpoints:

### Health Check
```
GET /health
```

### Get Options Chain
```
GET /api/schwab/chain/:symbol?includeQuotes=true
```

### Get Quote
```
GET /api/schwab/quote/:symbol
```

### Get Price History
```
GET /api/schwab/pricehistory/:symbol?periodType=day&period=1&frequencyType=minute&frequency=1
```

## Usage Example

1. Enter a symbol (e.g., SPY, QQQ, AAPL) in the search box
2. Click "Analyze" to fetch 0DTE options data
3. View key metrics:
   - Underlying price
   - Max pain level
   - Put/call ratio
   - Total call/put volume
4. Analyze the options chain table
5. Review volume and open interest distribution charts
6. Enable auto-refresh for live monitoring

## Components

### OptionsMetrics
Displays key metrics including:
- Underlying price
- Max pain strike
- Put/call ratio
- Total volume statistics

### OptionsTable
Shows the complete options chain with calls and puts side-by-side:
- Volume and open interest
- Bid/ask prices
- Implied volatility
- Greeks

### VolumeChart
Visualizes volume and open interest distribution across strike prices using histogram charts.

### PriceChart
Displays candlestick price charts (ready for integration with price history data).

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SCHWAB_CLIENT_ID` | Your Schwab API client ID | Yes |
| `SCHWAB_CLIENT_SECRET` | Your Schwab API client secret | Yes |
| `SCHWAB_ACCESS_TOKEN` | Your Schwab API access token | Yes |
| `SCHWAB_REFRESH_TOKEN` | Your Schwab API refresh token | No |
| `SCHWAB_REDIRECT_URI` | OAuth redirect URI | Yes |
| `PORT` | Backend server port | No (default: 3001) |
| `VITE_API_URL` | Backend API URL (frontend) | No (default: http://localhost:3001) |

## Notes

- This application is designed for authorized use with a valid Schwab API account
- Rate limits apply based on your Schwab API tier
- OAuth token refresh is not fully implemented - you'll need to manually refresh tokens
- 0DTE options data is only available on trading days

## Future Enhancements

- [ ] Complete OAuth flow implementation
- [ ] Token auto-refresh mechanism
- [ ] Historical analysis and backtesting
- [ ] Greeks visualization
- [ ] Multi-symbol comparison
- [ ] Export data to CSV
- [ ] Custom alerts and notifications
- [ ] Dark/light theme toggle

## License

MIT

## Disclaimer

This tool is for educational and informational purposes only. Options trading carries significant risk. Always do your own research and consult with a financial advisor before making investment decisions.
