'use client'

import { ThemeProvider } from 'next-themes'

export default function RootProviders({ children }) {
  return (
    <ThemeProvider attribute="class" storageKey="public-theme" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
