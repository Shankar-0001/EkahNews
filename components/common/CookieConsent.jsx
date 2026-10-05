'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'cookie_consent'

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    const consent = localStorage.getItem(STORAGE_KEY)
    if (!consent) setVisible(true)
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

  if (!mounted) return null
  if (!visible) return null

  return (
    <section aria-label="Cookie preferences" className="fixed inset-x-0 bottom-0 z-[1000] border-t border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
      <div className="mx-auto max-w-6xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Allow optional cookies?</p>
          <details className="text-sm">
            <summary className="inline-flex min-h-11 cursor-pointer items-center px-2 underline">Cookie details</summary>
            <p className="max-h-[35svh] overflow-y-auto py-2 leading-relaxed">
              We use cookies and similar technologies to improve your experience, analyze traffic, and serve personalized ads. By clicking "Accept", you consent to the use of cookies. Third-party vendors, including Google, may use cookies to serve ads based on your browsing activity. Learn more in our{' '}
              <a href="/privacy-policy" className="text-blue-700 underline">Privacy Policy</a>.
            </p>
          </details>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
          <button type="button" onClick={() => updateConsent('accepted')} className="min-h-11 rounded-lg border border-slate-700 bg-white px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">Accept</button>
          <button type="button" onClick={() => updateConsent('declined')} className="min-h-11 rounded-lg border border-slate-700 bg-white px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">Decline</button>
        </div>
      </div>
    </section>
  )
}
