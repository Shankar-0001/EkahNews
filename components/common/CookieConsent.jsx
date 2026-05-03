'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cookie_consent'

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    const storedConsent = window.localStorage.getItem(STORAGE_KEY)
    setVisible(!storedConsent)
  }, [])

  const updateConsent = (value) => {
    window.localStorage.setItem(STORAGE_KEY, value)
    setVisible(false)

    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: value === 'accepted' ? 'granted' : 'denied',
        analytics_storage: value === 'accepted' ? 'granted' : 'denied',
      })
    }
  }

  if (!mounted || !visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: '#ffffff',
        color: '#111827',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -8px 24px rgba(15, 23, 42, 0.08)',
        padding: '16px',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
          We use cookies to improve your experience and serve personalized ads. See our Privacy Policy.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => updateConsent('accepted')}
            style={{
              backgroundColor: '#111827',
              color: '#ffffff',
              border: '1px solid #111827',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => updateConsent('declined')}
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
