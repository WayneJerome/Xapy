'use client'

import { useState } from 'react'
import styles from './EngineControls.module.css'

interface EngineControlsProps {
  engineState: 'idle' | 'running' | 'killed'
  killSwitchActive: boolean
  onStart: () => Promise<void>
  onStop: () => Promise<void>
  onKillSwitch: () => Promise<void>
  onResetKill: () => Promise<void>
}

export default function EngineControls({
  engineState,
  killSwitchActive,
  onStart,
  onStop,
  onKillSwitch,
  onResetKill,
}: EngineControlsProps) {
  const [confirmKill, setConfirmKill] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleStartStop = async () => {
    setLoading(true)
    try {
      if (engineState === 'running') {
        await onStop()
      } else {
        await onStart()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKillSwitch = async () => {
    if (!confirmKill) {
      setConfirmKill(true)
      setTimeout(() => setConfirmKill(false), 3000) // Reset after 3s
      return
    }
    setLoading(true)
    try {
      if (killSwitchActive) {
        await onResetKill()
      } else {
        await onKillSwitch()
      }
    } finally {
      setLoading(false)
      setConfirmKill(false)
    }
  }

  const stateColor =
    engineState === 'running' ? 'var(--success)' :
    engineState === 'killed' ? 'var(--danger)' : 'var(--text-muted)'

  const stateLabel =
    engineState === 'running' ? 'RUNNING' :
    engineState === 'killed' ? 'KILLED' : 'IDLE'

  return (
    <div className={`glass-panel ${styles.container}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Engine Control</h3>
        <div className={styles.stateIndicator}>
          <div className={styles.stateDot} style={{ background: stateColor, boxShadow: `0 0 10px ${stateColor}` }} />
          <span className={styles.stateLabel} style={{ color: stateColor }}>{stateLabel}</span>
        </div>
      </div>

      {/* Engine Status Visual */}
      <div className={styles.statusRing}>
        <div className={`${styles.ring} ${styles[`ring_${engineState}`]}`}>
          <div className={styles.ringInner}>
            <div className={styles.ringCore}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={stateColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {engineState === 'running' ? (
                  <>
                    <polygon points="5 3 19 12 5 21 5 3" fill={stateColor} opacity="0.2" />
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </>
                ) : engineState === 'killed' ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" fill={stateColor} opacity="0.1" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </>
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className={styles.controls}>
        <button
          className={`${styles.startBtn} ${engineState === 'running' ? styles.stopMode : styles.startMode}`}
          onClick={handleStartStop}
          disabled={loading || killSwitchActive}
        >
          <span className={styles.btnIcon}>
            {engineState === 'running' ? '■' : '▶'}
          </span>
          {loading ? 'Processing...' : engineState === 'running' ? 'Stop Engine' : 'Start Engine'}
        </button>

        <button
          className={`${styles.killBtn} ${killSwitchActive ? styles.killActive : ''} ${confirmKill && !killSwitchActive ? styles.killConfirm : ''}`}
          onClick={handleKillSwitch}
          disabled={loading}
        >
          <span className={styles.killIcon}>⚡</span>
          {killSwitchActive
            ? 'Reset Kill Switch'
            : confirmKill
              ? 'CONFIRM KILL — Click Again'
              : 'Emergency Kill Switch'
          }
        </button>
      </div>

      {killSwitchActive && (
        <div className={styles.killBanner}>
          <span>🔴</span>
          <span>Kill switch activated — All replication halted. Reset to resume operations.</span>
        </div>
      )}
    </div>
  )
}
