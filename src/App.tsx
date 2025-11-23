import { useState, useEffect } from 'react';
import { useOptionsData } from './hooks/useOptionsData';
import { OptionsMetrics } from './components/OptionsMetrics';
import { OptionsTable } from './components/OptionsTable';
import { VolumeChart } from './components/VolumeChart';
import './App.css';

function App() {
  const [symbol, setSymbol] = useState('SPY');
  const [inputValue, setInputValue] = useState('SPY');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data, quote, loading, error, refetch } = useOptionsData(symbol, autoRefresh, 30000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSymbol(inputValue.trim().toUpperCase());
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Schwab 0DTE Options Analyzer</h1>
        <p className="subtitle">Real-time analysis of zero days to expiration options</p>
      </header>

      <div className="controls">
        <form onSubmit={handleSubmit} className="search-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter symbol (e.g., SPY, QQQ)"
            className="symbol-input"
          />
          <button type="submit" className="submit-btn">
            Analyze
          </button>
        </form>

        <div className="control-buttons">
          <button onClick={refetch} className="refresh-btn" disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <label className="auto-refresh-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <p className="error-hint">
            Make sure the Schwab API server is running and configured correctly.
          </p>
        </div>
      )}

      {loading && !data && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading options data for {symbol}...</p>
        </div>
      )}

      {data && (
        <div className="content">
          <OptionsMetrics data={data} />

          <VolumeChart
            volumeByStrike={data.volumeByStrike}
            openInterestByStrike={data.openInterestByStrike}
            underlyingPrice={data.underlyingPrice}
            height={300}
          />

          <OptionsTable data={data} maxRows={25} />
        </div>
      )}

      {!loading && !error && !data && (
        <div className="welcome">
          <h2>Welcome to 0DTE Options Analyzer</h2>
          <p>Enter a symbol above to get started analyzing zero days to expiration options.</p>
          <div className="features">
            <div className="feature">
              <h3>Real-time Data</h3>
              <p>Live options chain data via Schwab API</p>
            </div>
            <div className="feature">
              <h3>Max Pain Analysis</h3>
              <p>Calculate max pain strike levels</p>
            </div>
            <div className="feature">
              <h3>Volume Analysis</h3>
              <p>Visualize volume and open interest distribution</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
