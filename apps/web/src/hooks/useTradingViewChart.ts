import { useRef, useEffect, useCallback } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  LineData, 
  ChartOptions,
  ColorType 
} from 'lightweight-charts';

interface ChartConfig {
  width: number;
  height: number;
  layout?: {
    backgroundColor: string;
    textColor: string;
  };
  grid?: {
    vertLines: { color: string };
    horzLines: { color: string };
  };
  timeScale?: {
    timeVisible: boolean;
    secondsVisible: boolean;
  };
}

export const useTradingViewChart = (config: ChartConfig) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chartOptions: ChartOptions = {
      width: config.width,
      height: config.height,
      layout: {
        background: { type: ColorType.Solid, color: config.layout?.backgroundColor || '#ffffff' },
        textColor: config.layout?.textColor || '#333333',
      },
      grid: {
        vertLines: { 
          color: config.grid?.vertLines.color || '#f0f0f0',
          style: 0,
          visible: true,
        },
        horzLines: { 
          color: config.grid?.horzLines.color || '#f0f0f0',
          style: 0,
          visible: true,
        },
      },
      timeScale: {
        timeVisible: config.timeScale?.timeVisible ?? true,
        secondsVisible: config.timeScale?.secondsVisible ?? false,
        borderColor: '#cccccc',
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#2196F3',
          width: 1,
          style: 2,
          visible: true,
          labelVisible: true,
          labelBackgroundColor: '#2196F3',
        },
        horzLine: {
          color: '#2196F3',
          width: 1,
          style: 2,
          visible: true,
          labelVisible: true,
          labelBackgroundColor: '#2196F3',
        },
      },
    };

    chartRef.current = createChart(chartContainerRef.current, chartOptions);

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        seriesMapRef.current.clear();
      }
    };
  }, [config]);

  useEffect(() => {
    const cleanup = initializeChart();
    return cleanup;
  }, [initializeChart]);

  const addLineSeries = useCallback((options: {
    color: string;
    lineWidth?: number;
    title?: string;
    id?: string;
  }): ISeriesApi<any> | null => {
    if (!chartRef.current) return null;

    const series = chartRef.current.addSeries(LineSeries, {
      color: options.color,
      lineWidth: (options.lineWidth || 2) as any,
      title: options.title,
    });

    if (options.id) {
      seriesMapRef.current.set(options.id, series);
    }

    // Set as main series if it's the first one
    if (!seriesRef.current) {
      seriesRef.current = series;
    }

    return series;
  }, []);

  const updateSeriesData = useCallback((data: LineData[], seriesId?: string) => {
    const targetSeries = seriesId 
      ? seriesMapRef.current.get(seriesId) 
      : seriesRef.current;
    
    if (targetSeries) {
      targetSeries.setData(data);
    }
  }, []);

  const addDataPoint = useCallback((dataPoint: LineData, seriesId?: string) => {
    const targetSeries = seriesId 
      ? seriesMapRef.current.get(seriesId) 
      : seriesRef.current;
    
    if (targetSeries) {
      targetSeries.update(dataPoint);
    }
  }, []);

  const clearAllSeries = useCallback(() => {
    if (!chartRef.current) return;
    
    // Remove all series from the map
    seriesMapRef.current.forEach(series => {
      chartRef.current?.removeSeries(series);
    });
    
    // Clear main series if it exists and isn't already in the map
    if (seriesRef.current) {
      try {
        chartRef.current.removeSeries(seriesRef.current);
      } catch (e) {
        // Series may have already been removed
      }
    }
    
    seriesRef.current = null;
    seriesMapRef.current.clear();
  }, []);

  const resizeChart = useCallback((width: number, height: number) => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        width,
        height,
      });
    }
  }, []);

  return {
    chartContainerRef,
    chart: chartRef.current,
    addLineSeries,
    updateSeriesData,
    addDataPoint,
    clearAllSeries,
    resizeChart,
  };
};