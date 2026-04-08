'use client'

import { useSupabaseSync } from '../../lib/useSupabaseSync'
import styles from './Dashboard.module.css'
import MarketChart from './MarketChart'
import DrawdownGauge from './DrawdownGauge'
import EngineControls from './EngineControls'
import PnLTracker from './PnLTracker'

export default function Dashboard() {
  const {
    logs,
    accounts,
    engineState,
    killSwitchActive,
    setEngineRunning,
    setEngineStopped,
    activateKillSwitch,
    deactivateKillSwitch,
  } = useSupabaseSync()

  // Simulated KPI data (plug in real Supabase data as available)
  const totalPnL = 2847.50
  const tradesToday = logs.length || 24
  const activePositions = 6
  const dailyDrawdownPct = 2.8

  return (
    <div className="page-container">
      {/* ─── Header ─── */}
      <header className={styles.header}>
        <div>
          <h1 className="heading-gradient" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Command Center
          </h1>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
            HFT Agency • Trade Replication Network
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.statusBadge}>
            <div className={`${styles.pulse} ${killSwitchActive ? styles.pulseRed : engineState === 'running' ? styles.pulseGreen : styles.pulseGray}`} />
            <span>{killSwitchActive ? 'KILLED' : engineState === 'running' ? 'LIVE' : 'STANDBY'}</span>
          </div>
        </div>
      </header>

      {/* ─── KPI Cards Row ─── */}
      <div className={styles.kpiGrid}>
        <div className={`glass-panel ${styles.kpiCard}`} style={{ animationDelay: '0ms' }}>
          <span className="stat-label">Total P&L Today</span>
          <span className={`stat-value ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-success" style={{ fontSize: 11, fontWeight: 600 }}>↑ 3.2% from yesterday</span>
        </div>

        <div className={`glass-panel ${styles.kpiCard}`} style={{ animationDelay: '50ms' }}>
          <span className="stat-label">Daily Drawdown</span>
          <span className={`stat-value ${dailyDrawdownPct > 4 ? 'text-danger' : dailyDrawdownPct > 3 ? 'text-warning' : 'text-success'}`}>
            {dailyDrawdownPct.toFixed(1)}%
          </span>
          <span className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>Max: 5.0%</span>
        </div>

        <div className={`glass-panel ${styles.kpiCard}`} style={{ animationDelay: '100ms' }}>
          <span className="stat-label">Trades Today</span>
          <span className="stat-value text-accent">{tradesToday}</span>
          <span className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>{activePositions} positions open</span>
        </div>

        <div className={`glass-panel ${styles.kpiCard}`} style={{ animationDelay: '150ms' }}>
          <span className="stat-label">Slave Accounts</span>
          <span className="stat-value text-purple">{accounts.length || 0}</span>
          <span className="text-success" style={{ fontSize: 11, fontWeight: 600 }}>All connected</span>
        </div>

        <div className={`glass-panel ${styles.kpiCard}`} style={{ animationDelay: '200ms' }}>
          <span className="stat-label">Win Rate</span>
          <span className="stat-value text-accent">64.8%</span>
          <span className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>Last 100 trades</span>
        </div>
      </div>

      {/* ─── Main Grid: Chart + Controls ─── */}
      <div className={styles.mainGrid}>
        {/* Market Chart — takes 2/3 width */}
        <div className={styles.chartArea}>
          <MarketChart />
        </div>

        {/* Right Sidebar — Engine + Drawdown */}
        <div className={styles.sidePanel}>
          <EngineControls
            engineState={engineState}
            killSwitchActive={killSwitchActive}
            onStart={setEngineRunning}
            onStop={setEngineStopped}
            onKillSwitch={activateKillSwitch}
            onResetKill={deactivateKillSwitch}
          />
          <DrawdownGauge />
        </div>
      </div>

      {/* ─── Bottom Grid: P&L + Logs + Accounts ─── */}
      <div className={styles.bottomGrid}>
        {/* P&L Tracker */}
        <div className={styles.pnlArea}>
          <PnLTracker logs={logs} />
        </div>

        {/* Live Activity Log */}
        <div className={`glass-panel ${styles.logPanel}`}>
          <div className={styles.logHeader}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Live Activity</h3>
            <span className={styles.logCount}>{logs.length} events</span>
          </div>
          <div className={styles.logContainer}>
            {logs.length === 0 ? (
              <p className={styles.emptyState}>
                <span style={{ fontSize: 24, marginBottom: 8, display: 'block' }}>📡</span>
                Waiting for trade signals...
              </p>
            ) : (
              logs.slice(0, 15).map((log, i) => (
                <div key={i} className={styles.logItem} style={{ animationDelay: `${i * 30}ms` }}>
                  <div className={`${styles.logDot} ${log.action === 'OPEN' ? styles.dotGreen : styles.dotRed}`} />
                  <div className={styles.logContent}>
                    <div className={styles.logMain}>
                      <span className={styles.logAction}>{log.action}</span>
                      <span className={styles.logSymbol}>{log.symbol}</span>
                    </div>
                    <span className={styles.logMeta}>{log.slave_id} • #{log.slave_ticket}</span>
                  </div>
                  <span className={styles.logTime}>
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'now'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Account Network */}
        <div className={`glass-panel ${styles.accountPanel}`}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Network Nodes</h3>
          <div className={styles.accountList}>
            {accounts.map((acc) => (
              <div key={acc.id} className={styles.accountCard}>
                <div className={styles.accountTop}>
                  <div className={styles.accountInfo}>
                    <span className={styles.accountName}>{acc.name || `Account ${acc.login}`}</span>
                    <span className={styles.accountMeta}>{acc.login} • {acc.server}</span>
                  </div>
                  <span className={styles.brokerBadge}>{acc.broker}</span>
                </div>
                <div className={styles.accountStats}>
                  <div className={styles.accountStat}>
                    <span className="stat-label">Balance</span>
                    <span className="text-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      ${(acc.balance || 10000).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.accountStat}>
                    <span className="stat-label">Equity</span>
                    <span className="text-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      ${(acc.equity || 10250).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.accountStat}>
                    <span className="stat-label">P&L</span>
                    <span className="text-mono text-success" style={{ fontSize: 13, fontWeight: 600 }}>
                      +${(acc.pnl || 250).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <p className={styles.emptyState}>
                <span style={{ fontSize: 24, marginBottom: 8, display: 'block' }}>🔗</span>
                No accounts linked
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
