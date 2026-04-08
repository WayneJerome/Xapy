'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useSupabaseSync } from '../../lib/useSupabaseSync'

export default function ConfigPage() {
  const { config } = useSupabaseSync()
  const [localConfig, setLocalConfig] = useState<any>({
    MAX_LOT_SIZE: '10.0',
    DEFAULT_SLIPPAGE_PCT: '1.0'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      setLocalConfig(config)
    }
  }, [config])

  const handleUpdate = async (key: string, value: string) => {
    setLocalConfig({ ...localConfig, [key]: value })
  }

  const saveConfig = async () => {
    setSaving(true)
    const updates = Object.entries(localConfig).map(([key, value]: [string, any]) => ({
      key,
      value: value.toString(),
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase.from('system_config').upsert(updates, { onConflict: 'key' })
    setSaving(false)
    if (error) alert(error.message)
  }

  return (
    <div className="page-container">
      <h1 className="heading-gradient text-4xl font-bold mb-2">Engine Settings</h1>
      <p className="text-muted mb-10">Tweak replication logic and risk parameters with live impact.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-panel p-8">
          <h2 className="text-xl font-semibold mb-6">Global Risk Controls</h2>
          
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Max Allowed Lot Size</label>
                <span className="text-accent-color font-bold">{localConfig.MAX_LOT_SIZE}</span>
              </div>
              <input 
                type="range" 
                min="0.01" 
                max="50" 
                step="0.1"
                className="w-full accent-blue-400 opacity-80 hover:opacity-100 transition-opacity"
                value={localConfig.MAX_LOT_SIZE}
                onChange={e => handleUpdate('MAX_LOT_SIZE', e.target.value)}
              />
              <p className="text-xs text-muted mt-2">Safety cap to prevent massive order replication.</p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Slippage Tolerance (%)</label>
                <span className="text-accent-color font-bold">{localConfig.DEFAULT_SLIPPAGE_PCT}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="5" 
                step="0.1"
                className="w-full accent-blue-400 opacity-80 hover:opacity-100 transition-opacity"
                value={localConfig.DEFAULT_SLIPPAGE_PCT}
                onChange={e => handleUpdate('DEFAULT_SLIPPAGE_PCT', e.target.value)}
              />
              <p className="text-xs text-muted mt-2">Trades will be skipped if market price deviates more than this from master.</p>
            </div>
          </div>

          <button 
            className="glass-button primary w-full mt-10"
            onClick={saveConfig}
            disabled={saving}
          >
            {saving ? 'Syncing...' : 'Apply Live Changes'}
          </button>
        </div>

        <div className="glass-panel p-8">
          <h2 className="text-xl font-semibold mb-6">System Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between p-4 bg-white/5 rounded-lg border border-white/5">
              <span>Replication Engine</span>
              <span className="text-success font-bold">Active</span>
            </div>
            <div className="flex justify-between p-4 bg-white/5 rounded-lg border border-white/5">
              <span>Database Sync</span>
              <span className="text-success font-bold">Connected</span>
            </div>
            <div className="flex justify-between p-4 bg-white/5 rounded-lg border border-white/5">
              <span>Master Socket</span>
              <span className="text-success font-bold">Listening</span>
            </div>
          </div>
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300 leading-relaxed">
              <strong>Tip:</strong> Changes made here are pushed via Supabase and picked up by the Python engine in real-time if persistent polling is enabled.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
