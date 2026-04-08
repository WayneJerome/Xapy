'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './MarketChart.module.css'

// Dynamically import lightweight-charts to avoid SSR issues
let createChart: any = null
let CandlestickSeries: any = null
let HistogramSeries: any = null
let ColorType: any = null

interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'NAS100', 'US30']
const TIMEFRAMES = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '1H', seconds: 3600 },
  { label: '4H', seconds: 14400 },
]

function generateSimulatedData(symbol: string, tfSeconds: number, count: number = 200): CandleData[] {
  const now = Math.floor(Date.now() / 1000)
  const startTime = now - count * tfSeconds
  const data: CandleData[] = []

  // Different base prices per symbol
  const basePrices: Record<string, number> = {
    EURUSD: 1.0850, GBPUSD: 1.2650, USDJPY: 151.50,
    XAUUSD: 2340.00, BTCUSD: 84500.00, NAS100: 19800.00, US30: 42500.00,
  }

  let price = basePrices[symbol] || 1.0
  const volatility = symbol.includes('XAU') ? 3.0 : symbol.includes('BTC') ? 150 : symbol.includes('NAS') || symbol.includes('US30') ? 25 : 0.002

  for (let i = 0; i < count; i++) {
    const time = startTime + i * tfSeconds
    const change = (Math.random() - 0.48) * volatility
    const open = price
    const close = open + change
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5
    const volume = Math.floor(Math.random() * 1000) + 100

    data.push({
      time: time as number,
      open: parseFloat(open.toFixed(symbol.includes('JPY') ? 3 : symbol.includes('XAU') || symbol.includes('BTC') || symbol.includes('NAS') || symbol.includes('US30') ? 2 : 5)),
      high: parseFloat(high.toFixed(symbol.includes('JPY') ? 3 : symbol.includes('XAU') || symbol.includes('BTC') || symbol.includes('NAS') || symbol.includes('US30') ? 2 : 5)),
      low: parseFloat(low.toFixed(symbol.includes('JPY') ? 3 : symbol.includes('XAU') || symbol.includes('BTC') || symbol.includes('NAS') || symbol.includes('US30') ? 2 : 5)),
      close: parseFloat(close.toFixed(symbol.includes('JPY') ? 3 : symbol.includes('XAU') || symbol.includes('BTC') || symbol.includes('NAS') || symbol.includes('US30') ? 2 : 5)),
      volume,
    })
    price = close
  }
  return data
}

export default function MarketChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const [selectedSymbol, setSelectedSymbol] = useState('XAUUSD')
  const [selectedTF, setSelectedTF] = useState(TIMEFRAMES[2]) // 15m default
  const [lastPrice, setLastPrice] = useState<number>(0)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [isLoaded, setIsLoaded] = useState(false)

  const initChart = useCallback(async () => {
    if (!chartContainerRef.current) return

    // Dynamic import
    if (!createChart) {
      const lc = await import('lightweight-charts')
      createChart = lc.createChart
      ColorType = lc.ColorType
    }

    // Destroy previous chart
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
      },
      crosshair: {
        vertLine: {
          color: 'rgba(56, 189, 248, 0.3)',
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: 'rgba(56, 189, 248, 0.3)',
          labelBackgroundColor: '#1e293b',
        },
      },
    })

    chartRef.current = chart

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    })
    candleSeriesRef.current = candleSeries

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    volumeSeriesRef.current = volumeSeries

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    // Load data
    const data = generateSimulatedData(selectedSymbol, selectedTF.seconds)
    candleSeries.setData(data)

    const volumeData = data.map((d) => ({
      time: d.time,
      value: d.volume || 0,
      color: d.close >= d.open ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
    }))
    volumeSeries.setData(volumeData)

    // Set last price
    if (data.length > 0) {
      const last = data[data.length - 1]
      const prev = data.length > 1 ? data[data.length - 2] : last
      setLastPrice(last.close)
      setPriceChange(((last.close - prev.close) / prev.close) * 100)
    }

    chart.timeScale().fitContent()

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(chartContainerRef.current)
    handleResize()
    setIsLoaded(true)

    return () => {
      resizeObserver.disconnect()
    }
  }, [selectedSymbol, selectedTF])

  useEffect(() => {
    const cleanup = initChart()
    return () => {
      cleanup?.then((fn) => fn?.())
    }
  }, [initChart])

  // Live tick simulation
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return
    const interval = setInterval(() => {
      if (!candleSeriesRef.current) return
      const now = Math.floor(Date.now() / 1000)
      const tfBucket = now - (now % selectedTF.seconds)

      const basePrices: Record<string, number> = {
        EURUSD: 1.0850, GBPUSD: 1.2650, USDJPY: 151.50,
        XAUUSD: 2340.00, BTCUSD: 84500.00, NAS100: 19800.00, US30: 42500.00,
      }
      const vol = selectedSymbol.includes('XAU') ? 0.5 : selectedSymbol.includes('BTC') ? 20 : selectedSymbol.includes('NAS') || selectedSymbol.includes('US30') ? 5 : 0.0003

      const tick = lastPrice + (Math.random() - 0.5) * vol
      const decimals = selectedSymbol.includes('JPY') ? 3 : selectedSymbol.includes('XAU') || selectedSymbol.includes('BTC') || selectedSymbol.includes('NAS') || selectedSymbol.includes('US30') ? 2 : 5
      const newPrice = parseFloat(tick.toFixed(decimals))

      setLastPrice(newPrice)
      setPriceChange(((newPrice - (basePrices[selectedSymbol] || 1)) / (basePrices[selectedSymbol] || 1)) * 100)

      candleSeriesRef.current.update({
        time: tfBucket,
        open: lastPrice,
        high: Math.max(lastPrice, newPrice),
        low: Math.min(lastPrice, newPrice),
        close: newPrice,
      })

      volumeSeriesRef.current.update({
        time: tfBucket,
        value: Math.floor(Math.random() * 100) + 10,
        color: newPrice >= lastPrice ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [lastPrice, selectedSymbol, selectedTF])

  return (
    <div className={`glass-panel ${styles.chartPanel}`}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <select
            className="glass-select"
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
          >
            {SYMBOLS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className={styles.tfGroup}>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.label}
                className={`${styles.tfBtn} ${selectedTF.label === tf.label ? styles.tfActive : ''}`}
                onClick={() => setSelectedTF(tf)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.priceDisplay}>
            <span className="text-mono" style={{ fontSize: 18, fontWeight: 700 }}>
              {lastPrice.toFixed(selectedSymbol.includes('JPY') ? 3 : selectedSymbol.includes('XAU') || selectedSymbol.includes('BTC') || selectedSymbol.includes('NAS') || selectedSymbol.includes('US30') ? 2 : 5)}
            </span>
            <span className={`text-mono ${priceChange >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: 12, fontWeight: 600 }}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className={styles.chartContainer} />
      {!isLoaded && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
        </div>
      )}
    </div>
  )
}
