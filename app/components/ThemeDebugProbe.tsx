'use client'

import { useEffect } from 'react'

export default function ThemeDebugProbe() {
  useEffect(() => {
    const prefersDark = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    const prefersLight = typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    const hasDarkClass = typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark')
    const htmlEl = document.documentElement
    const bodyEl = document.body
    const htmlStyles = htmlEl ? window.getComputedStyle(htmlEl) : null
    const bodyStyles = bodyEl ? window.getComputedStyle(bodyEl) : null

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e31ed8f-606c-4d4a-840c-4dfd29aa46a1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H4', location: 'ThemeDebugProbe.tsx', message: 'root/body theme styles', data: { prefersDark, prefersLight, hasDarkClass, html: htmlEl ? { className: htmlEl.className, backgroundColor: htmlStyles?.backgroundColor, color: htmlStyles?.color, colorScheme: htmlStyles?.colorScheme } : null, body: bodyEl ? { className: bodyEl.className, backgroundColor: bodyStyles?.backgroundColor, color: bodyStyles?.color, colorScheme: bodyStyles?.colorScheme } : null }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [])

  return null
}
