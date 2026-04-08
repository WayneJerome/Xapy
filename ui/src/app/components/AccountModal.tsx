'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './AccountModal.module.css'

export default function AccountModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [broker, setBroker] = useState<'MT5' | 'TRADELOCKER'>('MT5')
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    server: '',
    name: ''
  })
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.from('accounts').insert([{
      ...formData,
      broker,
      is_active: true
    }])

    setLoading(false)
    if (!error) {
      onClose()
      setFormData({ login: '', password: '', server: '', name: '' })
    } else {
      alert(error.message)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} glass-panel`} onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 heading-gradient">Add New Slave Account</h2>
        
        <div className="flex gap-4 mb-8">
          <button 
            className={`glass-button flex-1 ${broker === 'MT5' ? 'primary' : ''}`}
            onClick={() => setBroker('MT5')}
          >
            MetaTrader 5
          </button>
          <button 
            className={`glass-button flex-1 ${broker === 'TRADELOCKER' ? 'primary' : ''}`}
            onClick={() => setBroker('TRADELOCKER')}
          >
            TradeLocker
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted uppercase font-bold mb-1 block">Account Label</label>
            <input 
              className="glass-input" 
              placeholder="e.g. Personal Slave 1" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted uppercase font-bold mb-1 block">Login / Email</label>
              <input 
                className="glass-input" 
                placeholder="Account ID" 
                value={formData.login}
                onChange={e => setFormData({...formData, login: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted uppercase font-bold mb-1 block">Password</label>
              <input 
                type="password"
                className="glass-input" 
                placeholder="••••••••" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted uppercase font-bold mb-1 block">Server / Env</label>
            <input 
              className="glass-input" 
              placeholder={broker === 'MT5' ? "e.g. IC Markets-Demo" : "e.g. demo.tradelocker.com"} 
              value={formData.server}
              onChange={e => setFormData({...formData, server: e.target.value})}
              required
            />
          </div>

          <div className="mt-6 flex gap-4">
            <button type="button" className="glass-button flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="glass-button primary flex-1" disabled={loading}>
              {loading ? 'Connecting...' : 'Securely Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
