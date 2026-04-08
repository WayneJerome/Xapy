'use client'

import { useMemo } from 'react'
import styles from './PnLTracker.module.css'
import type { TradeLog } from '../../lib/useSupabaseSync'

interface PnLTrackerProps {
  logs: TradeLog[]
}

// Generate simulated P&L values for demo
function getSimulatedPnL(log: TradeLog, index: number): number {
  if (log.pnl !== undefined && log.pnl !== null) return log.pnl
  // Deterministic pseudo-random based on index and ticket
  const seed = (index * 7 + (log.slave_ticket?.charCodeAt(0) || 0)) % 100
  const isWin = seed > 35
  const magnitude = ((seed % 50) + 10) * (isWin ? 1 : -1)
  return magnitude
}

export default function PnLTracker({ logs }: PnLTrackerProps) {
  const pnlData = useMemo(() => {
    return logs.map((log, i) => ({
      ...log,
      computedPnl: getSimulatedPnL(log, i),
    }))
  }, [logs])

  const totalPnL = useMemo(() => pnlData.reduce((sum, d) => sum + d.computedPnl, 0), [pnlData])
  const wins = useMemo(() => pnlData.filter((d) => d.computedPnl > 0).length, [pnlData])
  const losses = useMemo(() => pnlData.filter((d) => d.computedPnl < 0).length, [pnlData])
  const winRate = pnlData.length > 0 ? ((wins / pnlData.length) * 100) : 0

  // Mini sparkline data (last 20 entries cumulative P&L)
  const sparkData = useMemo(() => {
    const recent = pnlData.slice(0, 20).reverse()
    let cumulative = 0
    return recent.map((d) => {
      cumulative += d.computedPnl
      return cumulative
    })
  }, [pnlData])

  const sparkMax = Math.max(...sparkData, 1)
  const sparkMin = Math.min(...sparkData, 0)
  const sparkRange = sparkMax - sparkMin || 1

  return (
    <div className={`glass-panel ${styles.container}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>P&L Tracker</h3>
        <span className={`text-mono ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: 11, fontWeight: 700 }}>
          {totalPnL >= 0 ? '↑' : '↓'} TODAY
        </span>
      </div>

      {/* Total P&L */}
      <div className={styles.totalPnl}>
        <span className={`stat-value ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
          {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
        </span>
        <span className="stat-label">Total P&L</span>
      </div>

      {/* Sparkline */}
      <div className={styles.sparkContainer}>
        <svg viewBox={`0 0 ${sparkData.length * 8} 40`} className={styles.sparkSvg} preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={totalPnL >= 0 ? 'var(--success)' : 'var(--danger)'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={totalPnL >= 0 ? 'var(--success)' : 'var(--danger)'} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path
            d={`M0,40 ${sparkData.map((v, i) => `L${i * 8},${40 - ((v - sparkMin) / sparkRange) * 36}`).join(' ')} L${(sparkData.length - 1) * 8},40 Z`}
            fill="url(#sparkGrad)"
          />
          {/* Line */}
          <polyline
            fill="none"
            stroke={totalPnL >= 0 ? 'var(--success)' : 'var(--danger)'}
            strokeWidth="1.5"
            points={sparkData.map((v, i) => `${i * 8},${40 - ((v - sparkMin) / sparkRange) * 36}`).join(' ')}
          />
        </svg>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className="stat-label">Wins</span>
          <span className="stat-value-sm text-success">{wins}</span>
        </div>
        <div className={styles.stat}>
          <span className="stat-label">Losses</span>
          <span className="stat-value-sm text-danger">{losses}</span>
        </div>
        <div className={styles.stat}>
          <span className="stat-label">Win Rate</span>
          <span className="stat-value-sm text-accent">{winRate.toFixed(1)}%</span>
        </div>
      </div>

      {/* Recent Trades */}
      <div className={styles.recentTrades}>
        <span className={styles.recentTitle}>Recent Trades</span>
        <div className={styles.tradeList}>
          {pnlData.slice(0, 8).map((trade, i) => (
            <div key={i} className={styles.tradeItem}>
              <div className={styles.tradeLeft}>
                <div className={`${styles.tradeDot} ${trade.computedPnl >= 0 ? styles.dotGreen : styles.dotRed}`} />
                <span className={styles.tradeSymbol}>{trade.symbol || 'N/A'}</span>
                <span className={styles.tradeAction}>{trade.action}</span>
              </div>
              <span className={`text-mono ${trade.computedPnl >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: 12, fontWeight: 600 }}>
                {trade.computedPnl >= 0 ? '+' : ''}{trade.computedPnl.toFixed(2)}
              </span>
            </div>
          ))}
          {pnlData.length === 0 && (
            <p className={styles.emptyMsg}>No trades recorded yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
