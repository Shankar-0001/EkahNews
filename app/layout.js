import './globals.css'
import SiteFooter from '@/components/layout/SiteFooter'
import { SITE_URL } from '@/lib/site-config'
import RootProviders from '@/components/layout/RootProviders'
import OptionalGlobalScripts from '@/components/layout/OptionalGlobalScripts'

export const metadata = {
  title: 'EkahNews - Latest News and Insights',
  description: 'Your trusted source for breaking news, trending stories, and expert insights.',
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <OptionalGlobalScripts />
        <RootProviders>
          {children}
          <SiteFooter />
        </RootProviders>
      </body>
    </html>
  )
}
