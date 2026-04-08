'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Navbar.module.css'

export default function Navbar() {
  const pathname = usePathname()
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/config', label: 'Parameters' },
    { href: '/logs', label: 'Trade Log' },
  ]

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◆</span>
          <span className={styles.glow}>Xapy</span>
          <span className={styles.logoSuffix}>HQ</span>
        </div>
      </div>

      <div className={styles.center}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.link} ${pathname === link.href ? styles.activeLink : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className={styles.right}>
        <div className={styles.statusDots}>
          <div className={styles.dotGroup}>
            <div className={`${styles.dot} ${styles.dotOnline}`} />
            <span>Engine</span>
          </div>
          <div className={styles.dotGroup}>
            <div className={`${styles.dot} ${styles.dotOnline}`} />
            <span>DB</span>
          </div>
          <div className={styles.dotGroup}>
            <div className={`${styles.dot} ${styles.dotOnline}`} />
            <span>Feed</span>
          </div>
        </div>
        <div className={styles.clock}>
          <span className={styles.clockTime}>{time}</span>
          <span className={styles.clockLabel}>UTC+3</span>
        </div>
      </div>
    </nav>
  )
}
