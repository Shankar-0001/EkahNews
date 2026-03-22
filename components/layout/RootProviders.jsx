'use client'

import { ThemeProvider } from 'next-themes'
import { usePathname } from 'next/navigation'

function isAmpStoryPath(pathname = '') {
  return pathname.startsWith('/web-stories/') && pathname !== '/web-stories'
}

export default function RootProviders({ children }) {
  const pathname = usePathname() || ''

  if (isAmpStoryPath(pathname)) {
    return children
  }

  return (
    <ThemeProvider attribute="class" storageKey="public-theme" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
