import React, { useMemo, useEffect, useState } from 'react';
import { LineData, UTCTimestamp } from 'lightweight-charts';
import { useTradingViewChart } from '../hooks/useTradingViewChart';

interface EquityCurveChartProps {
  simulationResults?: {
    equity_paths: number[][];
    final_equity: number[];
    statistics: {
      mean_final_equity: number;
      median_final_equity: number;
      p95_max_drawdown: number;
      prob_2x: number;
      prob_3x: number;
      sharpe_ratio: number;
      profit_factor: number;
    };
    params: {
      weeks: number;
      trades_per_week: number;
    };
  };
  width?: number;
  height?: number;
  showPaths?: number;
  showStatistics?: boolean;
  isLoading?: boolean;
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  simulationResults,
  width = 800,
  height = 400,
  showPaths = 10,
  showStatistics = true,
  isLoading = false,
}) => {
  const [chartDimensions, setChartDimensions] = useState({ width, height });

  const chartConfig = useMemo(() => ({
    width: chartDimensions.width,
    height: chartDimensions.height,
    layout: {
      backgroundColor: '#ffffff',
      textColor: '#333333',
    },
    grid: {
      vertLines: { color: '#f0f0f0' },
      horzLines: { color: '#f0f0f0' },
    },
    timeScale: {
      timeVisible: false,
      secondsVisible: false,
    },
  }), [chartDimensions]);

  const { 
    chartContainerRef, 
    chart, 
    addLineSeries, 
    clearAllSeries,
    resizeChart 
  } = useTradingViewChart(chartConfig);

  // Generate time series data from simulation results
  const processChartData = useMemo(() => {
    if (!simulationResults || !simulationResults.equity_paths.length) {
      return null;
    }

    const totalTrades = simulationResults.params.weeks * simulationResults.params.trades_per_week;

    // Calculate statistics for percentiles
    const meanPath: number[] = [];
    const p25Path: number[] = [];
    const p75Path: number[] = [];

    for (let i = 0; i <= totalTrades; i++) {
      const valuesAtPoint = simulationResults.equity_paths
        .map(path => path[i] || path[path.length - 1])
        .filter((val): val is number => typeof val === 'number');
      
      if (valuesAtPoint.length === 0) continue;
      
      valuesAtPoint.sort((a, b) => a - b);
      
      const mean = valuesAtPoint.reduce((sum, val) => sum + val, 0) / valuesAtPoint.length;
      const p25Index = Math.floor(valuesAtPoint.length * 0.25);
      const p75Index = Math.floor(valuesAtPoint.length * 0.75);
      
      meanPath.push(mean);
      p25Path.push(valuesAtPoint[p25Index] ?? mean);
      p75Path.push(valuesAtPoint[p75Index] ?? mean);
    }

    return {
      individualPaths: simulationResults.equity_paths.slice(0, showPaths),
      meanPath,
      p25Path,
      p75Path,
    };
  }, [simulationResults, showPaths]);

  // Update chart when data changes
  useEffect(() => {
    if (!chart || !processChartData) return;

    clearAllSeries();

    const { individualPaths, meanPath, p25Path, p75Path } = processChartData;

    // Add individual paths (with transparency)
    individualPaths.forEach((path, index) => {
      const series = addLineSeries({
        color: `rgba(128, 128, 128, 0.3)`,
        lineWidth: 1,
        title: `Path ${index + 1}`,
        id: `path-${index}`,
      });

      if (series) {
        const data: LineData[] = path.map((equity, i) => ({
          time: i as UTCTimestamp,
          value: equity,
        }));
        series.setData(data);
      }
    });

    // Add percentile bands
    const p75Series = addLineSeries({
      color: '#4CAF50',
      lineWidth: 2,
      title: '75th Percentile',
      id: 'p75',
    });
    
    const p25Series = addLineSeries({
      color: '#F44336',
      lineWidth: 2,
      title: '25th Percentile',
      id: 'p25',
    });

    const meanSeries = addLineSeries({
      color: '#2196F3',
      lineWidth: 3,
      title: 'Mean Path',
      id: 'mean',
    });

    if (p75Series) {
      const p75Data: LineData[] = p75Path.map((equity, i) => ({
        time: i as UTCTimestamp,
        value: equity,
      }));
      p75Series.setData(p75Data);
    }

    if (p25Series) {
      const p25Data: LineData[] = p25Path.map((equity, i) => ({
        time: i as UTCTimestamp,
        value: equity,
      }));
      p25Series.setData(p25Data);
    }

    if (meanSeries) {
      const meanData: LineData[] = meanPath.map((equity, i) => ({
        time: i as UTCTimestamp,
        value: equity,
      }));
      meanSeries.setData(meanData);
    }

  }, [chart, processChartData, addLineSeries, clearAllSeries]);

  // Handle responsive resizing
  useEffect(() => {
    const handleResize = () => {
      const container = chartContainerRef.current?.parentElement;
      if (container) {
        const containerWidth = container.clientWidth;
        const newWidth = Math.min(containerWidth - 32, width); // 32px for padding
        setChartDimensions({ width: newWidth, height });
        resizeChart(newWidth, height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial sizing

    return () => window.removeEventListener('resize', handleResize);
  }, [width, height, resizeChart, chartContainerRef]);

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg"
        style={{ width: chartDimensions.width, height: chartDimensions.height }}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Generating equity curves...</span>
        </div>
      </div>
    );
  }

  if (!simulationResults || !processChartData) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg"
        style={{ width: chartDimensions.width, height: chartDimensions.height }}
      >
        <div className="text-center">
          <div className="text-gray-400 mb-2">📈</div>
          <p className="text-sm text-gray-600">Run a simulation to see equity curves</p>
        </div>
      </div>
    );
  }

  return (
    <div className="equity-curve-chart">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Monte Carlo Equity Curves
        </h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>📊 Showing {showPaths} sample paths</span>
          <span>📈 {simulationResults.equity_paths.length} total simulations</span>
          <span>⏱️ {simulationResults.params.weeks} weeks × {simulationResults.params.trades_per_week} trades/week</span>
        </div>
      </div>

      <div className="chart-container bg-white border border-gray-200 rounded-lg p-4">
        <div ref={chartContainerRef} />
        
        {/* Chart Legend */}
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-500"></div>
            <span>Mean Path</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span>75th Percentile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span>25th Percentile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-gray-400 opacity-50"></div>
            <span>Sample Paths</span>
          </div>
        </div>
      </div>

      {/* Statistics Panel */}
      {showStatistics && simulationResults.statistics && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Simulation Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Mean Final Equity</div>
              <div className="font-semibold">
                ${simulationResults.statistics.mean_final_equity.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Median Final Equity</div>
              <div className="font-semibold">
                ${simulationResults.statistics.median_final_equity.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">P(≥2×)</div>
              <div className="font-semibold text-green-600">
                {(simulationResults.statistics.prob_2x * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-600">P(≥3×)</div>
              <div className="font-semibold text-green-600">
                {(simulationResults.statistics.prob_3x * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-600">Max Drawdown (P95)</div>
              <div className="font-semibold text-red-600">
                {(simulationResults.statistics.p95_max_drawdown * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-600">Sharpe Ratio</div>
              <div className="font-semibold">
                {simulationResults.statistics.sharpe_ratio.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Profit Factor</div>
              <div className="font-semibold">
                {simulationResults.statistics.profit_factor.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 mt-2 text-center">
        Powered by TradingView Lightweight Charts
      </div>
    </div>
  );
};