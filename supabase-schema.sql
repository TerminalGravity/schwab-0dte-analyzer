-- Schwab 0DTE Analyzer - Supabase Database Schema
-- 30-day retention policy for all order book data

-- Enable Row Level Security
ALTER DATABASE postgres SET timezone TO 'America/New_York';

-- ============================================================================
-- TABLE: options_quotes
-- Stores order book snapshots for all tracked options
-- ============================================================================
CREATE TABLE IF NOT EXISTS options_quotes (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    option_symbol VARCHAR(50) NOT NULL,
    strike_price DECIMAL(10, 2) NOT NULL,
    expiration_date DATE NOT NULL,
    option_type VARCHAR(4) NOT NULL CHECK (option_type IN ('CALL', 'PUT')),

    -- Order book data
    bid DECIMAL(10, 2),
    ask DECIMAL(10, 2),
    last DECIMAL(10, 2),
    mark DECIMAL(10, 2),
    volume INTEGER DEFAULT 0,
    open_interest INTEGER DEFAULT 0,

    -- Greeks
    delta DECIMAL(8, 6),
    gamma DECIMAL(8, 6),
    theta DECIMAL(8, 6),
    vega DECIMAL(8, 6),
    implied_volatility DECIMAL(8, 6),

    -- Metadata
    underlying_price DECIMAL(10, 2),
    days_to_expiration INTEGER,
    in_the_money BOOLEAN,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes
    CONSTRAINT unique_quote UNIQUE (option_symbol, timestamp)
);

CREATE INDEX idx_options_quotes_symbol ON options_quotes(symbol);
CREATE INDEX idx_options_quotes_timestamp ON options_quotes(timestamp);
CREATE INDEX idx_options_quotes_strike ON options_quotes(strike_price);
CREATE INDEX idx_options_quotes_type ON options_quotes(option_type);
CREATE INDEX idx_options_quotes_expiration ON options_quotes(expiration_date);

-- ============================================================================
-- TABLE: naked_positions
-- Tracks options where volume > open_interest * threshold
-- ============================================================================
CREATE TABLE IF NOT EXISTS naked_positions (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    option_symbol VARCHAR(50) NOT NULL,
    strike_price DECIMAL(10, 2) NOT NULL,
    option_type VARCHAR(4) NOT NULL CHECK (option_type IN ('CALL', 'PUT')),

    volume INTEGER NOT NULL,
    open_interest INTEGER NOT NULL,
    volume_oi_ratio DECIMAL(8, 2) NOT NULL,
    threshold_multiplier DECIMAL(4, 2) NOT NULL,

    -- Price data at detection
    bid DECIMAL(10, 2),
    ask DECIMAL(10, 2),
    mark DECIMAL(10, 2),
    underlying_price DECIMAL(10, 2),

    -- Detection metadata
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT unique_naked_position UNIQUE (option_symbol, detected_at)
);

CREATE INDEX idx_naked_positions_symbol ON naked_positions(symbol);
CREATE INDEX idx_naked_positions_detected_at ON naked_positions(detected_at);
CREATE INDEX idx_naked_positions_active ON naked_positions(is_active);

-- ============================================================================
-- TABLE: credit_spreads
-- Stores SPX credit spread opportunities
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_spreads (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL DEFAULT 'SPX',
    spread_type VARCHAR(10) NOT NULL CHECK (spread_type IN ('CALL', 'PUT')),

    -- Spread legs
    short_strike DECIMAL(10, 2) NOT NULL,
    long_strike DECIMAL(10, 2) NOT NULL,
    short_option_symbol VARCHAR(50) NOT NULL,
    long_option_symbol VARCHAR(50) NOT NULL,

    -- Pricing
    credit_received DECIMAL(10, 2) NOT NULL,
    max_profit DECIMAL(10, 2) NOT NULL,
    max_loss DECIMAL(10, 2) NOT NULL,
    break_even DECIMAL(10, 2) NOT NULL,
    risk_reward_ratio DECIMAL(8, 2),

    -- Probability metrics
    probability_of_profit DECIMAL(5, 2),
    delta_spread DECIMAL(8, 6),

    -- AI Analysis
    ai_score DECIMAL(5, 2),
    ai_confidence DECIMAL(5, 2),
    ai_reasoning TEXT,
    ai_model_used VARCHAR(50),

    -- Metadata
    underlying_price DECIMAL(10, 2),
    expiration_date DATE NOT NULL,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rank INTEGER,

    CONSTRAINT unique_spread UNIQUE (short_strike, long_strike, spread_type, analyzed_at)
);

CREATE INDEX idx_credit_spreads_analyzed_at ON credit_spreads(analyzed_at);
CREATE INDEX idx_credit_spreads_score ON credit_spreads(ai_score DESC);
CREATE INDEX idx_credit_spreads_rank ON credit_spreads(rank);

-- ============================================================================
-- TABLE: trade_signals
-- AI-generated trade signals for SPY/QQQ ATM options
-- ============================================================================
CREATE TABLE IF NOT EXISTS trade_signals (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL CHECK (symbol IN ('SPY', 'QQQ')),
    option_type VARCHAR(4) NOT NULL CHECK (option_type IN ('CALL', 'PUT')),
    signal_type VARCHAR(10) NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),

    -- Option details
    option_symbol VARCHAR(50) NOT NULL,
    strike_price DECIMAL(10, 2) NOT NULL,
    is_atm BOOLEAN DEFAULT FALSE,

    -- Pricing
    entry_price DECIMAL(10, 2),
    current_price DECIMAL(10, 2),
    underlying_price DECIMAL(10, 2),

    -- AI Analysis
    ai_confidence DECIMAL(5, 2) NOT NULL,
    ai_reasoning TEXT NOT NULL,
    ai_model_used VARCHAR(50) NOT NULL,
    predicted_direction VARCHAR(10),
    predicted_move_percent DECIMAL(5, 2),

    -- Signal metadata
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    executed BOOLEAN DEFAULT FALSE,

    -- Performance tracking
    actual_outcome VARCHAR(20),
    profit_loss DECIMAL(10, 2)
);

CREATE INDEX idx_trade_signals_symbol ON trade_signals(symbol);
CREATE INDEX idx_trade_signals_generated_at ON trade_signals(generated_at);
CREATE INDEX idx_trade_signals_active ON trade_signals(is_active);
CREATE INDEX idx_trade_signals_confidence ON trade_signals(ai_confidence DESC);

-- ============================================================================
-- TABLE: daily_pnl
-- Track daily profit/loss for all strategies
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_pnl (
    id BIGSERIAL PRIMARY KEY,
    trading_date DATE NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    strategy VARCHAR(50) NOT NULL,

    -- P&L metrics
    total_signals INTEGER DEFAULT 0,
    executed_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2),

    gross_profit DECIMAL(12, 2) DEFAULT 0,
    gross_loss DECIMAL(12, 2) DEFAULT 0,
    net_pnl DECIMAL(12, 2) DEFAULT 0,

    -- Best/worst trades
    best_trade_pnl DECIMAL(10, 2),
    worst_trade_pnl DECIMAL(10, 2),
    avg_trade_pnl DECIMAL(10, 2),

    -- Metadata
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_daily_pnl UNIQUE (trading_date, symbol, strategy)
);

CREATE INDEX idx_daily_pnl_date ON daily_pnl(trading_date DESC);
CREATE INDEX idx_daily_pnl_symbol ON daily_pnl(symbol);

-- ============================================================================
-- TABLE: ai_orchestration_log
-- Logs all AI model calls for monitoring and optimization
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_orchestration_log (
    id BIGSERIAL PRIMARY KEY,
    task_type VARCHAR(50) NOT NULL,
    model_used VARCHAR(50) NOT NULL,

    -- Request/Response
    input_data JSONB,
    output_data JSONB,

    -- Performance
    latency_ms INTEGER,
    tokens_used INTEGER,
    cost_usd DECIMAL(8, 4),

    -- Metadata
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    called_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_log_task_type ON ai_orchestration_log(task_type);
CREATE INDEX idx_ai_log_model ON ai_orchestration_log(model_used);
CREATE INDEX idx_ai_log_called_at ON ai_orchestration_log(called_at);

-- ============================================================================
-- AUTOMATIC 30-DAY RETENTION POLICY
-- Delete data older than 30 days automatically
-- ============================================================================

-- Function to delete old data
CREATE OR REPLACE FUNCTION delete_old_data()
RETURNS void AS $$
BEGIN
    -- Delete options quotes older than 30 days
    DELETE FROM options_quotes
    WHERE timestamp < NOW() - INTERVAL '30 days';

    -- Delete naked positions older than 30 days
    DELETE FROM naked_positions
    WHERE detected_at < NOW() - INTERVAL '30 days';

    -- Delete credit spreads older than 30 days
    DELETE FROM credit_spreads
    WHERE analyzed_at < NOW() - INTERVAL '30 days';

    -- Delete trade signals older than 30 days
    DELETE FROM trade_signals
    WHERE generated_at < NOW() - INTERVAL '30 days';

    -- Delete AI logs older than 30 days
    DELETE FROM ai_orchestration_log
    WHERE called_at < NOW() - INTERVAL '30 days';

    -- Keep daily P&L for 90 days (useful for backtesting)
    DELETE FROM daily_pnl
    WHERE trading_date < CURRENT_DATE - INTERVAL '90 days';

    RAISE NOTICE 'Deleted old data successfully';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job (requires pg_cron extension)
-- Run daily at 2 AM EST
-- Note: You need to enable pg_cron in Supabase dashboard
-- SELECT cron.schedule('delete-old-data', '0 2 * * *', 'SELECT delete_old_data();');

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Latest quotes for each option
CREATE OR REPLACE VIEW latest_options_quotes AS
SELECT DISTINCT ON (option_symbol)
    *
FROM options_quotes
ORDER BY option_symbol, timestamp DESC;

-- View: Active naked positions
CREATE OR REPLACE VIEW active_naked_positions AS
SELECT *
FROM naked_positions
WHERE is_active = TRUE
AND detected_at > NOW() - INTERVAL '1 day'
ORDER BY volume_oi_ratio DESC;

-- View: Today's top credit spreads
CREATE OR REPLACE VIEW todays_top_spreads AS
SELECT *
FROM credit_spreads
WHERE DATE(analyzed_at) = CURRENT_DATE
ORDER BY ai_score DESC, rank ASC
LIMIT 10;

-- View: Active trade signals
CREATE OR REPLACE VIEW active_trade_signals AS
SELECT *
FROM trade_signals
WHERE is_active = TRUE
AND generated_at > NOW() - INTERVAL '1 day'
AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY ai_confidence DESC;

-- View: Today's P&L summary
CREATE OR REPLACE VIEW todays_pnl_summary AS
SELECT
    symbol,
    strategy,
    SUM(net_pnl) as total_pnl,
    SUM(executed_trades) as total_trades,
    AVG(win_rate) as avg_win_rate
FROM daily_pnl
WHERE trading_date = CURRENT_DATE
GROUP BY symbol, strategy;

-- ============================================================================
-- GRANTS (adjust as needed for your security model)
-- ============================================================================

-- Grant access to service role
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

COMMENT ON TABLE options_quotes IS '30-day rolling window of options order book data';
COMMENT ON TABLE naked_positions IS 'Tracks options with volume > OI * 1.5 threshold';
COMMENT ON TABLE credit_spreads IS 'SPX credit spread opportunities with AI scoring';
COMMENT ON TABLE trade_signals IS 'AI-generated trade signals for SPY/QQQ ATM options';
COMMENT ON TABLE daily_pnl IS 'Daily P&L tracking and performance metrics';
COMMENT ON TABLE ai_orchestration_log IS 'Logs all AI model API calls for monitoring';
