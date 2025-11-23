import { useMemo } from 'react';
import type { OptionsAnalysis, OptionContract } from '../types/options';

interface OptionsTableProps {
  data: OptionsAnalysis;
  maxRows?: number;
}

export function OptionsTable({ data, maxRows = 20 }: OptionsTableProps) {
  // Group options by strike price
  const optionsByStrike = useMemo(() => {
    const strikes = new Map<number, { call?: OptionContract; put?: OptionContract }>();

    data.calls.forEach((call) => {
      const existing = strikes.get(call.strikePrice) || {};
      strikes.set(call.strikePrice, { ...existing, call });
    });

    data.puts.forEach((put) => {
      const existing = strikes.get(put.strikePrice) || {};
      strikes.set(put.strikePrice, { ...existing, put });
    });

    // Sort by strike price and get strikes around current price
    const sortedStrikes = Array.from(strikes.entries())
      .sort(([a], [b]) => a - b);

    // Find the ATM (at-the-money) strike
    const atmIndex = sortedStrikes.findIndex(
      ([strike]) => strike >= data.underlyingPrice
    );

    // Get strikes around ATM
    const startIndex = Math.max(0, atmIndex - Math.floor(maxRows / 2));
    const endIndex = Math.min(sortedStrikes.length, startIndex + maxRows);

    return sortedStrikes.slice(startIndex, endIndex);
  }, [data, maxRows]);

  const formatNumber = (num: number | undefined, decimals = 2) => {
    if (num === undefined) return '-';
    return num.toFixed(decimals);
  };

  const formatVolume = (num: number | undefined) => {
    if (num === undefined) return '-';
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Options Chain (0DTE)</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={{ ...styles.th, ...styles.callHeader }} colSpan={5}>CALLS</th>
              <th style={styles.th}>STRIKE</th>
              <th style={{ ...styles.th, ...styles.putHeader }} colSpan={5}>PUTS</th>
            </tr>
            <tr style={styles.subHeaderRow}>
              <th style={styles.subTh}>Volume</th>
              <th style={styles.subTh}>OI</th>
              <th style={styles.subTh}>Bid</th>
              <th style={styles.subTh}>Ask</th>
              <th style={styles.subTh}>IV</th>
              <th style={{ ...styles.subTh, ...styles.strikeHeader }}>Price</th>
              <th style={styles.subTh}>IV</th>
              <th style={styles.subTh}>Bid</th>
              <th style={styles.subTh}>Ask</th>
              <th style={styles.subTh}>OI</th>
              <th style={styles.subTh}>Volume</th>
            </tr>
          </thead>
          <tbody>
            {optionsByStrike.map(([strike, { call, put }]) => {
              const isATM = Math.abs(strike - data.underlyingPrice) < 5;
              const rowStyle = isATM ? { ...styles.row, ...styles.atmRow } : styles.row;

              return (
                <tr key={strike} style={rowStyle}>
                  {/* Call data */}
                  <td style={{ ...styles.td, ...styles.callCell }}>
                    {formatVolume(call?.totalVolume)}
                  </td>
                  <td style={{ ...styles.td, ...styles.callCell }}>
                    {formatVolume(call?.openInterest)}
                  </td>
                  <td style={{ ...styles.td, ...styles.callCell }}>
                    {formatNumber(call?.bid)}
                  </td>
                  <td style={{ ...styles.td, ...styles.callCell }}>
                    {formatNumber(call?.ask)}
                  </td>
                  <td style={{ ...styles.td, ...styles.callCell }}>
                    {formatNumber(call?.impliedVolatility, 1)}%
                  </td>

                  {/* Strike */}
                  <td style={{ ...styles.td, ...styles.strikeCell }}>
                    ${strike.toFixed(2)}
                  </td>

                  {/* Put data */}
                  <td style={{ ...styles.td, ...styles.putCell }}>
                    {formatNumber(put?.impliedVolatility, 1)}%
                  </td>
                  <td style={{ ...styles.td, ...styles.putCell }}>
                    {formatNumber(put?.bid)}
                  </td>
                  <td style={{ ...styles.td, ...styles.putCell }}>
                    {formatNumber(put?.ask)}
                  </td>
                  <td style={{ ...styles.td, ...styles.putCell }}>
                    {formatVolume(put?.openInterest)}
                  </td>
                  <td style={{ ...styles.td, ...styles.putCell }}>
                    {formatVolume(put?.totalVolume)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '20px',
  },
  title: {
    color: '#fff',
    fontSize: '20px',
    marginBottom: '15px',
    fontWeight: 'bold',
  },
  tableWrapper: {
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },
  headerRow: {
    backgroundColor: '#2B2B43',
  },
  subHeaderRow: {
    backgroundColor: '#252536',
  },
  th: {
    padding: '12px 8px',
    textAlign: 'center' as const,
    fontWeight: 'bold',
    borderBottom: '2px solid #3B3B53',
  },
  subTh: {
    padding: '8px',
    textAlign: 'center' as const,
    fontSize: '11px',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #3B3B53',
  },
  callHeader: {
    color: '#26a69a',
  },
  putHeader: {
    color: '#ef5350',
  },
  strikeHeader: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  row: {
    borderBottom: '1px solid #2B2B43',
  },
  atmRow: {
    backgroundColor: '#2a2a3a',
  },
  td: {
    padding: '10px 8px',
    textAlign: 'center' as const,
    color: '#d1d4dc',
  },
  callCell: {
    backgroundColor: 'rgba(38, 166, 154, 0.05)',
  },
  putCell: {
    backgroundColor: 'rgba(239, 83, 80, 0.05)',
  },
  strikeCell: {
    backgroundColor: '#2B2B43',
    fontWeight: 'bold',
    color: '#ffd700',
  },
};
