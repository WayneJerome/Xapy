'use client'

import { useState } from 'react'
import Dashboard from './components/Dashboard'
import AccountModal from './components/AccountModal'

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <main className="min-h-screen">
      <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 1680, margin: '0 auto', padding: '12px 24px 0' }}>
        <button
          className="glass-button primary"
          onClick={() => setIsModalOpen(true)}
          style={{ fontSize: 12 }}
        >
          + Add Account
        </button>
      </div>

      <Dashboard />

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  )
}
