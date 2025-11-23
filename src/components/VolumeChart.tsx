import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, HistogramData } from 'lightweight-charts';

interface VolumeChartProps {
  volumeByStrike: { [strike: string]: number };
  openInterestByStrike: { [strike: string]: number };
  underlyingPrice: number;
  height?: number;
  showOpenInterest?: boolean;
}

export function VolumeChart({
  volumeByStrike,
  openInterestByStrike,
  underlyingPrice,
  height = 300,
  showOpenInterest = true,
}: VolumeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const oiSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      timeScale: {
        visible: false,
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
      },
    });

    chartRef.current = chart;

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: {
        type: 'volume',
      },
    });

    volumeSeriesRef.current = volumeSeries;

    // Add open interest series if enabled
    if (showOpenInterest) {
      const oiSeries = chart.addHistogramSeries({
        color: '#8b5cf6',
        priceFormat: {
          type: 'volume',
        },
      });

      oiSeriesRef.current = oiSeries;
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, showOpenInterest]);

  // Update data when it changes
  useEffect(() => {
    if (!volumeSeriesRef.current) return;

    // Convert strike data to histogram format
    const volumeData: HistogramData[] = Object.entries(volumeByStrike)
      .map(([strike, volume]) => ({
        time: parseFloat(strike) as any,
        value: volume,
        color: parseFloat(strike) > underlyingPrice ? '#26a69a' : '#ef5350',
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    volumeSeriesRef.current.setData(volumeData);

    if (oiSeriesRef.current && showOpenInterest) {
      const oiData: HistogramData[] = Object.entries(openInterestByStrike)
        .map(([strike, oi]) => ({
          time: parseFloat(strike) as any,
          value: oi,
          color: parseFloat(strike) > underlyingPrice ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));

      oiSeriesRef.current.setData(oiData);
    }

    chartRef.current?.timeScale().fitContent();
  }, [volumeByStrike, openInterestByStrike, underlyingPrice, showOpenInterest]);

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={styles.header}>
        <h3 style={styles.title}>Volume by Strike</h3>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: '#3b82f6' }} />
            <span>Volume</span>
          </div>
          {showOpenInterest && (
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: '#8b5cf6' }} />
              <span>Open Interest</span>
            </div>
          )}
        </div>
      </div>
      <div
        ref={chartContainerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: `${height}px`,
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
        }}
      />
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    padding: '0 10px',
  },
  title: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  legend: {
    display: 'flex',
    gap: '20px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#d1d4dc',
    fontSize: '12px',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
};
