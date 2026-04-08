'use client'

import { useState, useMemo } from 'react'
import { useSupabaseSync, TradeLog } from '../../lib/useSupabaseSync'

export default function LogsPage() {
  const { logs } = useSupabaseSync()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState<string>('ALL')
  const [sortField, setSortField] = useState<'time' | 'symbol'>('time')

  const filteredLogs = useMemo(() => {
    let filtered = [...logs]

    if (filterAction !== 'ALL') {
      filtered = filtered.filter((l) => l.action === filterAction)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.symbol?.toLowerCase().includes(q) ||
          l.slave_id?.toLowerCase().includes(q) ||
          l.slave_ticket?.toLowerCase().includes(q) ||
          l.master_ticket?.toLowerCase().includes(q)
      )
    }

    if (sortField === 'symbol') {
      filtered.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''))
    }

    return filtered
  }, [logs, searchQuery, filterAction, sortField])

  const handleCopyAll = () => {
    const text = filteredLogs
      .map(
        (l) =>
          `${l.created_at || 'N/A'}\t${l.symbol}\t${l.action}\t${l.slave_id}\t${l.slave_ticket}\t${l.master_ticket}`
      )
      .join('\n')
    navigator.clipboard.writeText(text)
  }

  // Simulated P&L for display
  const getSimPnl = (log: TradeLog, i: number) => {
    if (log.pnl !== undefined && log.pnl !== null) return log.pnl
    const seed = (i * 7 + (log.slave_ticket?.charCodeAt(0) || 0)) % 100
    return ((seed % 50) + 10) * (seed > 35 ? 1 : -1)
  }

  return (
    <div className="page-container" style={{ maxWidth: 1400 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="heading-gradient" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Trade History
        </h1>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          Complete log of all replicated trade events
        </p>
      </div>

      {/* Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <input
          className="glass-input"
          placeholder="Search symbol, slave ID, ticket..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 300, fontSize: 12 }}
        />

        <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 2, border: '1px solid var(--glass-border)' }}>
          {['ALL', 'OPEN', 'CLOSE'].map((a) => (
            <button
              key={a}
              className="glass-button"
              onClick={() => setFilterAction(a)}
              style={{
                padding: '5px 14px',
                fontSize: 11,
                fontWeight: 700,
                background: filterAction === a ? 'var(--accent-dim)' : 'transparent',
                color: filterAction === a ? 'var(--accent-color)' : 'var(--text-muted)',
                borderColor: filterAction === a ? 'rgba(56,189,248,0.3)' : 'transparent',
                borderRadius: 6,
              }}
            >
              {a}
            </button>
          ))}
        </div>

        <select
          className="glass-select"
          value={sortField}
          onChange={(e) => setSortField(e.target.value as any)}
        >
          <option value="time">Sort: Time</option>
          <option value="symbol">Sort: Symbol</option>
        </select>

        <div style={{ flex: 1 }} />

        <span className="text-muted" style={{ fontSize: 11, fontWeight: 600 }}>
          {filteredLogs.length} records
        </span>

        <button className="glass-button" onClick={handleCopyAll} style={{ fontSize: 11, padding: '6px 14px' }}>
          📋 Copy All
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {['Time', 'Symbol', 'Action', 'Slave ID', 'Slave Ticket', 'Master Ticket', 'P&L'].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 700,
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: '40px 16px',
                      textAlign: 'center',
                      color: 'var(--text-dim)',
                      fontSize: 13,
                    }}
                  >
                    No trade records found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, i) => {
                  const pnl = getSimPnl(log, i)
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.15s',
                        cursor: 'default',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--mono-font)', color: 'var(--text-dim)', fontSize: 11 }}>
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'var(--mono-font)' }}>
                        {log.symbol || '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 5,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            background: log.action === 'OPEN' ? 'var(--success-dim)' : 'var(--danger-dim)',
                            color: log.action === 'OPEN' ? 'var(--success)' : 'var(--danger)',
                            border: `1px solid ${log.action === 'OPEN' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 11 }}>
                        {log.slave_id || '—'}
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--mono-font)', color: 'var(--text-dim)', fontSize: 11 }}>
                        {log.slave_ticket || '—'}
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--mono-font)', color: 'var(--text-dim)', fontSize: 11 }}>
                        {log.master_ticket || '—'}
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          fontFamily: 'var(--mono-font)',
                          fontWeight: 700,
                          fontSize: 12,
                          color: pnl >= 0 ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
