'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

export interface TradeLog {
  id?: string
  master_ticket: string
  slave_id: string
  slave_ticket: string
  symbol: string
  action: string
  pnl?: number
  volume?: number
  side?: string
  created_at?: string
}

export interface Account {
  id: string
  login: string
  password?: string
  server: string
  name: string
  broker: string
  is_active: boolean
  balance?: number
  equity?: number
  pnl?: number
}

export interface SystemConfig {
  [key: string]: string
}

export function useSupabaseSync() {
  const [logs, setLogs] = useState<TradeLog[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [config, setConfig] = useState<SystemConfig>({})
  const [engineState, setEngineState] = useState<'idle' | 'running' | 'killed'>('idle')
  const [killSwitchActive, setKillSwitchActive] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: logData } = await supabase
        .from('trade_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      const { data: accData } = await supabase.from('accounts').select('*')
      const { data: cfgData } = await supabase.from('system_config').select('*')

      if (logData) setLogs(logData)
      if (accData) setAccounts(accData)
      if (cfgData) {
        const cfgObj: SystemConfig = cfgData.reduce(
          (acc: SystemConfig, item: any) => ({ ...acc, [item.key]: item.value }),
          {} as SystemConfig
        )
        setConfig(cfgObj)

        // Derive engine state
        if (cfgObj.KILL_SWITCH === 'true') {
          setEngineState('killed')
          setKillSwitchActive(true)
        } else if (cfgObj.ENGINE_STATE === 'running') {
          setEngineState('running')
          setKillSwitchActive(false)
        } else {
          setEngineState('idle')
          setKillSwitchActive(false)
        }
      }
    }

    fetchData()

    // Real-time: trade_logs
    const logSub = supabase
      .channel('trade_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trade_logs' },
        (payload: { new: any }) => {
          setLogs((prev) => [payload.new, ...prev.slice(0, 49)])
        }
      )
      .subscribe()

    // Real-time: accounts
    const accSub = supabase
      .channel('accounts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setAccounts((prev) => [...prev, payload.new])
          } else if (payload.eventType === 'DELETE') {
            setAccounts((prev) => prev.filter((acc: any) => acc.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setAccounts((prev) =>
              prev.map((acc: any) => (acc.id === payload.new.id ? payload.new : acc))
            )
          }
        }
      )
      .subscribe()

    // Real-time: system_config
    const cfgSub = supabase
      .channel('system_config_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_config' },
        (payload: any) => {
          if (payload.new) {
            setConfig((prev) => ({ ...prev, [payload.new.key]: payload.new.value }))
            if (payload.new.key === 'ENGINE_STATE') {
              if (payload.new.value === 'running') setEngineState('running')
              else if (payload.new.value === 'killed') setEngineState('killed')
              else setEngineState('idle')
            }
            if (payload.new.key === 'KILL_SWITCH') {
              const isKilled = payload.new.value === 'true'
              setKillSwitchActive(isKilled)
              if (isKilled) setEngineState('killed')
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(logSub)
      supabase.removeChannel(accSub)
      supabase.removeChannel(cfgSub)
    }
  }, [])

  // ─── Mutation helpers ───

  const updateConfig = useCallback(async (key: string, value: string) => {
    await supabase.from('system_config').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  }, [])

  const setEngineRunning = useCallback(async () => {
    await updateConfig('ENGINE_STATE', 'running')
    await updateConfig('KILL_SWITCH', 'false')
    setEngineState('running')
    setKillSwitchActive(false)
  }, [updateConfig])

  const setEngineStopped = useCallback(async () => {
    await updateConfig('ENGINE_STATE', 'idle')
    setEngineState('idle')
  }, [updateConfig])

  const activateKillSwitch = useCallback(async () => {
    await updateConfig('KILL_SWITCH', 'true')
    await updateConfig('ENGINE_STATE', 'killed')
    setKillSwitchActive(true)
    setEngineState('killed')
  }, [updateConfig])

  const deactivateKillSwitch = useCallback(async () => {
    await updateConfig('KILL_SWITCH', 'false')
    await updateConfig('ENGINE_STATE', 'idle')
    setKillSwitchActive(false)
    setEngineState('idle')
  }, [updateConfig])

  return {
    logs,
    accounts,
    config,
    engineState,
    killSwitchActive,
    updateConfig,
    setEngineRunning,
    setEngineStopped,
    activateKillSwitch,
    deactivateKillSwitch,
  }
}
