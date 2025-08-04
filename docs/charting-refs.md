# Charting Libraries Reference

This document contains implementation notes, API references, and integration patterns for charting libraries used in the Alpha Scanner project.

## TradingView Lightweight Charts v5.0

### Attribution Requirements (MANDATORY)

**⚠️ CRITICAL**: The Lightweight Charts license requires the following attribution:

1. **Attribution Notice**: Include the content from the NOTICE file
2. **TradingView Link**: Must include a visible link to https://www.tradingview.com
3. **Implementation**: Add to public page footer or chart component

```html
<!-- Required Attribution Example -->
<div class="chart-attribution">
  <p>Charts powered by <a href="https://www.tradingview.com" target="_blank">TradingView</a></p>
</div>
```

### Key v5.0 API Changes

**Breaking Changes from v4.x:**
- `addLineSeries()` → `addSeries(LineSeries, options)`
- `chart.series()` method removed - track series manually
- `DeepPartial<ChartOptions>` required for configuration
- Import series types separately: `import { LineSeries } from 'lightweight-charts'`

### Essential Imports

```typescript
import { 
  createChart, 
  LineSeries,
  IChartApi, 
  ISeriesApi, 
  LineData, 
  ChartOptions,
  ColorType,
  DeepPartial,
  LineSeriesOptions
} from 'lightweight-charts';
```

### Chart Creation Pattern

```typescript
// Chart Configuration
const chartOptions: DeepPartial<ChartOptions> = {
  width: 800,
  height: 400,
  layout: {
    background: { type: ColorType.Solid, color: '#2a2a2a' },
    textColor: '#e0e0e0',
  },
  grid: {
    vertLines: { color: '#444' },
    horzLines: { color: '#444' },
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
  },
};

// Create Chart
const chart = createChart(container, chartOptions);

// Add Series (v5.0 API)
const series = chart.addSeries(LineSeries, {
  color: '#2196F3',
  lineWidth: 2,
  title: 'Equity Curve',
});

// Set Data
series.setData([
  { time: '2024-01-01', value: 100 },
  { time: '2024-01-02', value: 105 },
  // ...
]);
```

### Custom Hook Pattern

Our `useTradingViewChart` hook implements:
- Automatic chart cleanup
- Multiple series management
- Responsive sizing
- Type-safe configuration

```typescript
// Usage Example
const { chartContainerRef, addLineSeries, clearAllSeries } = useTradingViewChart({
  width: 800,
  height: 400,
  layout: { backgroundColor: '#2a2a2a', textColor: '#e0e0e0' }
});

// Add series
const series = addLineSeries({
  color: '#007bff',
  lineWidth: 2,
  title: 'Mean Equity',
  id: 'mean'
});
```

### Performance Considerations

- **Large Datasets**: Use `setData()` once rather than multiple `update()` calls
- **Multiple Series**: Limit to 20-30 series for optimal performance
- **Memory Management**: Call `chart.remove()` on cleanup
- **Responsive**: Use `chart.applyOptions({ width, height })` for resizing

### Common Data Formats

```typescript
// Line Data Format
interface LineData {
  time: string | UTCTimestamp;
  value: number;
}

// Candlestick Data Format  
interface CandlestickData {
  time: string | UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}
```

### Error Handling

```typescript
try {
  const series = chart.addSeries(LineSeries, options);
  series.setData(data);
} catch (error) {
  console.error('Chart error:', error);
  // Fallback to simple visualization
}
```

## Chart.js Integration

### Installation & Setup

```bash
npm install chart.js react-chartjs-2
```

### Required Registrations

```typescript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);
```

### Histogram Chart Pattern

```typescript
import { Bar } from 'react-chartjs-2';

const HistogramChart: React.FC<Props> = ({ data }) => {
  const chartData = {
    labels: bins.map(bin => `$${bin.min}K`),
    datasets: [{
      label: 'Frequency',
      data: bins.map(bin => bin.count),
      backgroundColor: 'rgba(0, 123, 255, 0.7)',
      borderColor: 'rgba(0, 123, 255, 1)',
      borderWidth: 1,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => `Range: ${context[0].label}`,
          label: (context) => `Count: ${context.raw}`,
        },
      },
    },
    scales: {
      x: { title: { display: true, text: 'Final Equity ($)' } },
      y: { title: { display: true, text: 'Frequency' } },
    },
  };

  return <Bar data={chartData} options={options} />;
};
```

## Integration Patterns

### Risk Sandbox Implementation

**Equity Curves (TradingView Lightweight Charts):**
- Multiple Monte Carlo simulation paths
- Mean, 25th, and 75th percentile overlays
- Interactive zoom and pan
- Real-time data updates

**Distribution Histograms (Chart.js):**
- Final equity outcome distribution
- Statistical overlays (mean, median, percentiles)
- Bin-based frequency display
- Tooltip with detailed statistics

### Data Flow

```typescript
// 1. Fetch simulation data
const simulationData = await runMonteCarloSimulation(params);

// 2. Process for TradingView (equity curves)
const equityPaths = simulationData.sample_equity_paths.map(path =>
  path.map((equity, index) => ({ time: index, value: equity }))
);

// 3. Process for Chart.js (histogram)
const finalEquityDist = simulationData.final_equity_distribution;
const bins = calculateHistogramBins(finalEquityDist, 30);
```

### Dark Mode Styling

Both libraries support dark mode through CSS custom properties:

```css
:root {
  --chart-background: #2a2a2a;
  --chart-text: #e0e0e0;
  --chart-border: #444;
  --chart-grid: #444;
}
```

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure correct v5.0 types are imported
2. **Attribution Missing**: Verify TradingView link is visible
3. **Memory Leaks**: Always call `chart.remove()` in cleanup
4. **Performance**: Limit series count and data points
5. **Responsive Issues**: Use proper container sizing

### Debug Tips

```typescript
// Enable chart debugging
const chart = createChart(container, {
  ...options,
  // Add debug logging in development
});

console.log('Chart created:', chart);
console.log('Series count:', seriesMapRef.current.size);
```

## Resources

- **TradingView Lightweight Charts Docs**: https://tradingview.github.io/lightweight-charts/docs
- **Chart.js Documentation**: https://www.chartjs.org/docs/latest/
- **React Chart.js 2**: https://react-chartjs-2.js.org/
- **License Information**: Apache License 2.0 (TradingView), MIT (Chart.js)

---

**Last Updated**: 2025-01-04  
**Chart Library Versions**: TradingView Lightweight Charts v5.0.8, Chart.js v4.5.0