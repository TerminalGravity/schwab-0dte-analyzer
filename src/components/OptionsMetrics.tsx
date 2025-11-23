import type { OptionsAnalysis } from '../types/options';

interface OptionsMetricsProps {
  data: OptionsAnalysis;
}

export function OptionsMetrics({ data }: OptionsMetricsProps) {
  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toString();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{data.symbol} - 0DTE Options Metrics</h2>

      <div style={styles.grid}>
        <MetricCard
          label="Underlying Price"
          value={`$${formatNumber(data.underlyingPrice)}`}
          color="#fff"
        />

        <MetricCard
          label="Max Pain"
          value={`$${formatNumber(data.maxPain)}`}
          color="#ffd700"
        />

        <MetricCard
          label="Put/Call Ratio"
          value={formatNumber(data.putCallRatio, 3)}
          color={data.putCallRatio > 1 ? '#ef5350' : '#26a69a'}
        />

        <MetricCard
          label="Total Call Volume"
          value={formatLargeNumber(data.totalCallVolume)}
          color="#26a69a"
        />

        <MetricCard
          label="Total Put Volume"
          value={formatLargeNumber(data.totalPutVolume)}
          color="#ef5350"
        />

        <MetricCard
          label="Total Contracts"
          value={formatLargeNumber(data.calls.length + data.puts.length)}
          color="#d1d4dc"
        />
      </div>

      <div style={styles.timestamp}>
        Last Updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  color: string;
}

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={{ ...styles.value, color }}>{value}</div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  title: {
    color: '#fff',
    fontSize: '24px',
    marginBottom: '20px',
    fontWeight: 'bold',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px',
  },
  card: {
    backgroundColor: '#2B2B43',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #3B3B53',
  },
  label: {
    color: '#9ca3af',
    fontSize: '12px',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '24px',
    fontWeight: 'bold',
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: '12px',
    textAlign: 'right' as const,
    marginTop: '10px',
  },
};
