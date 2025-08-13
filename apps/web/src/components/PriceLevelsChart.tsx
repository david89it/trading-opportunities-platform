import React, { useEffect, useMemo, useState } from 'react'
import { LineData, UTCTimestamp } from 'lightweight-charts'
import { useTradingViewChart } from '../hooks/useTradingViewChart'

interface PriceLevelsChartProps {
  width?: number
  height?: number
  entry: number
  stop: number
  target1: number
  target2?: number | null
}

export const PriceLevelsChart: React.FC<PriceLevelsChartProps> = ({
  width = 800,
  height = 240,
  entry,
  stop,
  target1,
  target2,
}) => {
  const [chartDimensions, setChartDimensions] = useState({ width, height })

  const chartConfig = useMemo(
    () => ({
      width: chartDimensions.width,
      height: chartDimensions.height,
      layout: { backgroundColor: '#111827', textColor: '#cbd5e1' },
      grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
      timeScale: { timeVisible: false, secondsVisible: false },
      rightPriceScale: { visible: true },
    }),
    [chartDimensions]
  )

  const { chartContainerRef, chart, addLineSeries, clearAllSeries, resizeChart } =
    useTradingViewChart(chartConfig)

  useEffect(() => {
    if (!chart) return
    clearAllSeries()

    const levelToSeries = [
      { value: stop, color: '#ef4444', title: 'Stop' },
      { value: entry, color: '#60a5fa', title: 'Entry' },
      { value: target1, color: '#22c55e', title: 'Target 1' },
      ...(target2 ? [{ value: target2, color: '#16a34a', title: 'Target 2' }] : []),
    ]

    const makeData = (y: number): LineData[] =>
      Array.from({ length: 50 }).map((_, i) => ({ time: i as UTCTimestamp, value: y }))

    levelToSeries.forEach((lvl, idx) => {
      const series = addLineSeries({ color: lvl.color, lineWidth: 2, title: lvl.title, id: `lvl-${idx}` })
      if (series) series.setData(makeData(lvl.value))
    })
  }, [chart, addLineSeries, clearAllSeries, entry, stop, target1, target2])

  useEffect(() => {
    const onResize = () => {
      const container = chartContainerRef.current?.parentElement
      if (container) {
        const w = Math.min(container.clientWidth - 32, width)
        setChartDimensions({ width: w, height })
        resizeChart(w, height)
      }
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [chartContainerRef, resizeChart, width, height])

  return (
    <div>
      <div ref={chartContainerRef} />
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
        Price levels preview (entry/stop/targets). Price series coming soon.
      </div>
    </div>
  )
}

export default PriceLevelsChart


