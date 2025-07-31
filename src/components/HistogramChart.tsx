import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface HistogramChartProps {
  finalEquityData?: number[];
  binCount?: number;
  width?: number;
  height?: number;
  showStatistics?: boolean;
  isLoading?: boolean;
}

interface HistogramBin {
  min: number;
  max: number;
  count: number;
  percentage: number;
  midpoint: number;
}

interface HistogramStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  stdDev: number;
}

export const HistogramChart: React.FC<HistogramChartProps> = ({
  finalEquityData,
  binCount = 30,
  width = 600,
  height = 400,
  showStatistics = true,
  isLoading = false,
}) => {

  // Process data into histogram bins
  const histogramData = useMemo(() => {
    if (!finalEquityData || finalEquityData.length === 0) {
      return null;
    }

    const sortedData = [...finalEquityData].sort((a, b) => a - b);
    const min = Math.min(...sortedData);
    const max = Math.max(...sortedData);
    const binWidth = (max - min) / binCount;

    // Create bins
    const bins: HistogramBin[] = [];
    for (let i = 0; i < binCount; i++) {
      const binMin = min + i * binWidth;
      const binMax = min + (i + 1) * binWidth;
      bins.push({
        min: binMin,
        max: binMax,
        count: 0,
        percentage: 0,
        midpoint: (binMin + binMax) / 2,
      });
    }

    // Count data points in each bin
    sortedData.forEach(value => {
      let binIndex = Math.floor((value - min) / binWidth);
      // Handle edge case where value equals max
      if (binIndex >= binCount) binIndex = binCount - 1;
      
      // Ensure binIndex is valid
      if (binIndex >= 0 && binIndex < bins.length && bins[binIndex]) {
        bins[binIndex].count++;
      }
    });

    // Calculate percentages
    bins.forEach(bin => {
      bin.percentage = (bin.count / sortedData.length) * 100;
    });

    const statistics: HistogramStatistics = {
      min,
      max,
      mean: sortedData.reduce((sum, val) => sum + val, 0) / sortedData.length,
      median: sortedData[Math.floor(sortedData.length / 2)],
      p25: sortedData[Math.floor(sortedData.length * 0.25)],
      p75: sortedData[Math.floor(sortedData.length * 0.75)],
      stdDev: Math.sqrt(
        sortedData.reduce((sum, val) => {
          const mean = sortedData.reduce((s, v) => s + v, 0) / sortedData.length;
          return sum + Math.pow(val - mean, 2);
        }, 0) / sortedData.length
      ),
    };

    return {
      bins,
      statistics,
    };
  }, [finalEquityData, binCount]);

  // Chart.js configuration
  const chartData = useMemo(() => {
    if (!histogramData) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = histogramData.bins.map(bin => 
      `$${(bin.midpoint / 1000).toFixed(0)}K`
    );

    return {
      labels,
      datasets: [
        {
          label: 'Frequency',
          data: histogramData.bins.map(bin => bin.count),
          backgroundColor: 'rgba(33, 150, 243, 0.6)',
          borderColor: 'rgba(33, 150, 243, 1)',
          borderWidth: 1,
          borderRadius: 2,
        },
      ],
    };
  }, [histogramData]);

  const chartOptions: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Final Equity Distribution',
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#374151',
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            const contextItem = context[0];
            if (!contextItem) return '';
            const binIndex = contextItem.dataIndex;
            const bin = histogramData?.bins[binIndex];
            if (bin) {
              return `$${(bin.min / 1000).toFixed(0)}K - $${(bin.max / 1000).toFixed(0)}K`;
            }
            return '';
          },
          label: (context) => {
            const binIndex = context.dataIndex;
            const bin = histogramData?.bins[binIndex];
            if (bin) {
              return [
                `Count: ${bin.count}`,
                `Percentage: ${bin.percentage.toFixed(1)}%`,
              ];
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Final Portfolio Value',
          font: {
            size: 12,
            weight: 'bold',
          },
          color: '#6B7280',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Frequency',
          font: {
            size: 12,
            weight: 'bold',
          },
          color: '#6B7280',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        beginAtZero: true,
      },
    },
  }), [histogramData]);

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg"
        style={{ width, height }}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Generating distribution...</span>
        </div>
      </div>
    );
  }

  if (!finalEquityData || !histogramData) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="text-gray-400 mb-2">📊</div>
          <p className="text-sm text-gray-600">Run a simulation to see distribution</p>
        </div>
      </div>
    );
  }

  return (
    <div className="histogram-chart">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div style={{ width, height }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Statistics Panel */}
      {showStatistics && histogramData.statistics && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Distribution Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Mean</div>
              <div className="font-semibold">
                ${histogramData.statistics.mean.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Median</div>
              <div className="font-semibold">
                ${histogramData.statistics.median.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Standard Deviation</div>
              <div className="font-semibold">
                ${histogramData.statistics.stdDev.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Range</div>
              <div className="font-semibold">
                ${(histogramData.statistics.min / 1000).toFixed(0)}K - ${(histogramData.statistics.max / 1000).toFixed(0)}K
              </div>
            </div>
            <div>
              <div className="text-gray-600">25th Percentile</div>
              <div className="font-semibold">
                ${histogramData.statistics.p25.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">75th Percentile</div>
              <div className="font-semibold">
                ${histogramData.statistics.p75.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Sample Size</div>
              <div className="font-semibold">
                {finalEquityData.length.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Bins</div>
              <div className="font-semibold">
                {binCount}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 mt-2 text-center">
        Distribution of final portfolio values across all simulation runs
      </div>
    </div>
  );
};