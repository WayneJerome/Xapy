'use client'

import { useState, useEffect } from 'react'
import styles from './DrawdownGauge.module.css'

interface DrawdownGaugeProps {
  maxDrawdownPct?: number
  currentBalance?: number
  startOfDayBalance?: number
}

export default function DrawdownGauge({
  maxDrawdownPct = 5.0,
  currentBalance = 97200,
  startOfDayBalance = 100000,
}: DrawdownGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0)

  const drawdownAmount = startOfDayBalance - currentBalance
  const drawdownPct = startOfDayBalance > 0 ? (drawdownAmount / startOfDayBalance) * 100 : 0
  const fillPct = Math.min((drawdownPct / maxDrawdownPct) * 100, 100)

  // Determine severity
  const severity =
    drawdownPct >= maxDrawdownPct * 0.8
      ? 'critical'
      : drawdownPct >= maxDrawdownPct * 0.6
        ? 'warning'
        : 'safe'

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(fillPct), 100)
    return () => clearTimeout(timer)
  }, [fillPct])

  const trailingDrawdown = drawdownPct * 0.7 // Simulated trailing

  return (
    <div className={`glass-panel ${styles.container}`}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Daily Drawdown</h3>
          <p className={styles.subtitle}>Max Allowed: {maxDrawdownPct.toFixed(1)}%</p>
        </div>
        <div className={`${styles.severityBadge} ${styles[severity]}`}>
          {severity === 'critical' ? '⚠ BREACH RISK' : severity === 'warning' ? '⚡ CAUTION' : '✓ SAFE'}
        </div>
      </div>

      {/* Main Gauge */}
      <div className={styles.gaugeContainer}>
        <div className={styles.gaugeTrack}>
          <div
            className={`${styles.gaugeFill} ${styles[`fill_${severity}`]}`}
            style={{ width: `${animatedValue}%` }}
          />
          {/* Threshold markers */}
          <div className={styles.marker60} title="60% threshold" />
          <div className={styles.marker80} title="80% threshold" />
        </div>
        <div className={styles.gaugeLabels}>
          <span>0%</span>
          <span>{(maxDrawdownPct * 0.6).toFixed(1)}%</span>
          <span>{(maxDrawdownPct * 0.8).toFixed(1)}%</span>
          <span>{maxDrawdownPct.toFixed(1)}%</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className="stat-label">Current DD</span>
          <span className={`stat-value-sm ${severity === 'critical' ? 'text-danger' : severity === 'warning' ? 'text-warning' : 'text-success'}`}>
            {drawdownPct.toFixed(2)}%
          </span>
        </div>
        <div className={styles.statItem}>
          <span className="stat-label">DD Amount</span>
          <span className="stat-value-sm text-danger">
            -${drawdownAmount.toLocaleString()}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className="stat-label">Trailing DD</span>
          <span className="stat-value-sm text-warning">
            {trailingDrawdown.toFixed(2)}%
          </span>
        </div>
        <div className={styles.statItem}>
          <span className="stat-label">Remaining</span>
          <span className="stat-value-sm text-success">
            ${(startOfDayBalance * (maxDrawdownPct / 100) - drawdownAmount).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Alert Banner */}
      {severity === 'critical' && (
        <div className={styles.alertBanner}>
          <span className={styles.alertIcon}>🚨</span>
          <span>Approaching max daily drawdown limit. Consider reducing exposure.</span>
        </div>
      )}
    </div>
  )
}
