'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Bot, Briefcase, Cpu, Menu, Moon, Newspaper, Search, Share2, Sparkles, Star, Sun, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { activeMenu } from '@/lib/navigation-model.mjs'

const SUBMENU_META = {
  news: { title: 'News', icon: Newspaper },
  crypto: { title: 'Crypto', icon: Sparkles },
  markets: { title: 'Markets', icon: TrendingUp },
  ai: { title: 'AI', icon: Bot },
  technology: { title: 'Technology', icon: Cpu },
  business: { title: 'Business', icon: Briefcase },
  'web-stories': { title: 'Web Stories', icon: Sparkles },
  sponsored: { title: 'Sponsored', icon: Briefcase },
}

function GoogleNewsIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M8 10a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V10z" />
      <path fill="#34A853" d="M30 8h6a4 4 0 0 1 4 4v2h-6a4 4 0 0 1-4-4V8z" />
      <path fill="#FBBC04" d="M34 14h8v20a4 4 0 0 1-4 4h-4V14z" />
      <path fill="#EA4335" d="M30 8h8l-8 8V8z" />
      <path fill="#fff" d="M15 18h13v2.8H15zm0 5.8h18v2.8H15zm0 5.8h18v2.8H15z" />
      <path fill="#fff" d="M14.5 15.5h6.2v6.2h-6.2z" opacity=".95" />
      <path fill="#4285F4" d="M17.6 16.9c.7 0 1.4.3 1.8.8l-.8.8a1.4 1.4 0 0 0-1-.4 1.7 1.7 0 0 0 0 3.4c1 0 1.5-.6 1.6-1.1h-1.6v-1.1h2.8c0 1.7-1.2 3.3-2.8 3.3a2.8 2.8 0 0 1 0-5.7z" />
    </svg>
  )
}

function buildGoogleNewsUrl() {
  return process.env.NEXT_PUBLIC_GOOGLE_NEWS_URL || `https://news.google.com/search?q=${encodeURIComponent('EkahNews')}`
}

export default function PublicHeaderClient({ navigation = [], available = true }) {
  const MAIN_MENU = navigation
  const SUBMENU_CONFIG = useMemo(() => Object.fromEntries(navigation.filter(item => item.children.length).map(item => [item.key, [{title:item.label,items:item.children}]])), [navigation])
  const { resolvedTheme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentDateLabel, setCurrentDateLabel] = useState('Day, Date')
  const [activeMenuKey, setActiveMenuKey] = useState('home')
  const [submenuOpen, setSubmenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const activeSubmenuSlug = navigation.flatMap(item => item.children).find(item => item.href === pathname)?.slug
  const googleNewsUrl = useMemo(() => buildGoogleNewsUrl(), [])
  const activeSubmenuSections = SUBMENU_CONFIG[activeMenuKey] || []
  const activeSubmenuMeta = { icon:SUBMENU_META[activeMenuKey]?.icon || Newspaper, title:navigation.find(item => item.key === activeMenuKey)?.label || '' }

  useEffect(() => {
    setMounted(true)
    setCurrentDateLabel(
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(new Date())
    )
  }, [])

  useEffect(() => {
    setActiveMenuKey(activeMenu(pathname, navigation))
    setSubmenuOpen(Boolean(SUBMENU_CONFIG[activeMenu(pathname, navigation)]))
  }, [pathname, navigation, SUBMENU_CONFIG])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setMobileMenuOpen(false)
    }
  }

  const isActivePath = (href) => pathname === href
  const isSelectedMenu = (item) => activeMenuKey === item.key || isActivePath(item.href)
  const handleDesktopMenuClick = (item) => {
    const hasSubmenu = Boolean(SUBMENU_CONFIG[item.key])
    setActiveMenuKey(item.key)
    setSubmenuOpen((prev) => (activeMenuKey === item.key ? !prev : hasSubmenu))
  }
  const desktopMenuLinkClass = (item) =>
    `relative whitespace-nowrap text-[15px] font-black tracking-tight transition-colors ${
      isSelectedMenu(item)
        ? 'text-[#d62828] dark:text-white'
        : 'text-slate-900 hover:text-[#d62828] dark:text-slate-100 dark:hover:text-[#f8b4c7]'
    }`

  const mobileMenuLinkClass = (href) =>
    `rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
      isActivePath(href)
        ? 'border-[#d62828] bg-[#fff1f1] text-[#d62828] dark:border-[#d62828] dark:bg-[#3a1212] dark:text-white'
        : 'border-slate-200 bg-white text-slate-700 hover:border-[#d62828] hover:bg-[#fff5f5] hover:text-[#d62828] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900'
    }`

  return (
    <header className="z-50 bg-slate-50/95 text-slate-950 shadow-sm backdrop-blur-xl dark:bg-slate-950/95 dark:text-white">
      <div className="w-full px-4 py-4">
        {!available && <p role="status" className="text-sm text-slate-500">Navigation is temporarily unavailable.</p>}
        <div className="hidden md:block">
          <div className="grid items-center gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto]">
            <Link href="/" className="shrink-0" aria-label="EkahNews home">
              <span className="block text-[2rem] font-black leading-none tracking-tight text-slate-900 dark:text-white">
                <span className="text-[#d62828]">Ekah</span>News
              </span>
            </Link>

            <form onSubmit={handleSearch} className="mx-auto w-full max-w-[760px]">
              <div className="flex h-12 items-center rounded-full border border-slate-700 bg-slate-800 px-4 text-white dark:border-slate-500 dark:bg-slate-900">
                <Input
                  id="desktop-search"
                  name="q"
                  type="search"
                  placeholder="Search news"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-auto border-0 bg-transparent p-0 text-base text-white placeholder:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="ml-3 h-8 w-8 shrink-0 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white dark:hover:bg-slate-800"
                  aria-label="Search"
                >
                  <Search className="h-[18px] w-[18px]" />
                </Button>
              </div>
            </form>

            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden text-right lg:block">
                <div className="text-[1.1rem] font-black leading-none tracking-tight text-slate-900 dark:text-white">
                  {currentDateLabel}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-slate-300/80 bg-white/90 text-[#b4235a] hover:bg-slate-200 hover:text-[#8f1d48] dark:border-slate-700 dark:bg-slate-900 dark:text-[#d94b7d] dark:hover:bg-slate-800 dark:hover:text-[#f06b98]"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
              >
                {mounted && resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <a
                href={googleNewsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent bg-white/90 transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
                aria-label="Open EkahNews on Google News"
              >
                <GoogleNewsIcon />
              </a>
            </div>
          </div>

          <nav aria-label="Main navigation" className="mt-4 overflow-x-auto text-center [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center justify-center gap-6 px-2">
              {MAIN_MENU.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={desktopMenuLinkClass(item)}
                  onClick={() => handleDesktopMenuClick(item)}
                  suppressHydrationWarning
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {submenuOpen && activeSubmenuSections.length > 0 && (
            <div className="mx-auto mt-3 max-w-6xl pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                    <activeSubmenuMeta.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[1.45rem] font-medium leading-none tracking-[-0.03em] text-slate-900 dark:text-white">
                      {activeSubmenuMeta.title}
                    </h2>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 text-[0.88rem] font-medium text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                    aria-label={`Follow ${activeSubmenuMeta.title}`}
                  >
                    <Star className="h-3.5 w-3.5" />
                    Follow
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    aria-label={`Share ${activeSubmenuMeta.title}`}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {activeSubmenuSections.map((section) => (
                <div key={section.title} className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`inline-flex min-h-[34px] items-center rounded-[10px] border px-3 py-1 text-[0.84rem] font-medium tracking-[-0.01em] transition-colors ${
                          activeSubmenuSlug === item.slug
                            ? 'border-sky-200 bg-sky-200 text-slate-950 hover:bg-sky-300'
                            : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-1 py-1 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="shrink-0" aria-label="EkahNews home">
              <span className="block text-[1.8rem] font-black leading-none tracking-tight text-slate-900 dark:text-white">
                <span className="text-[#d62828]">Ekah</span>News
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-slate-300/80 bg-white/90 text-[#b4235a] hover:bg-slate-200 hover:text-[#8f1d48] dark:border-slate-700 dark:bg-slate-900 dark:text-[#d94b7d] dark:hover:bg-slate-800 dark:hover:text-[#f06b98]"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
              >
                {mounted && resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full border border-slate-300/80 text-slate-800 hover:bg-slate-200 hover:text-[#d62828] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <form onSubmit={handleSearch}>
                <div className="flex h-11 items-center rounded-full border border-slate-700 bg-slate-800 px-4 text-white dark:border-slate-500 dark:bg-slate-900">
                  <Input
                    id="mobile-search"
                    name="q"
                    type="search"
                    placeholder="Search news"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-auto border-0 bg-transparent p-0 text-sm text-white placeholder:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className="ml-3 h-8 w-8 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white dark:hover:bg-slate-800"
                    aria-label="Search"
                  >
                    <Search className="h-[18px] w-[18px]" />
                  </Button>
                </div>
              </form>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{currentDateLabel}</span>
                <a
                  href={googleNewsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-[#d62828] dark:text-slate-200"
                >
                  <GoogleNewsIcon />
                  Google News
                </a>
              </div>

              <nav aria-label="Mobile navigation" className="grid grid-cols-1 gap-2">
                {MAIN_MENU.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`${mobileMenuLinkClass(item.href)} ${item.key === 'home' ? 'font-semibold' : ''}`}
                    onClick={() => {
                      setActiveMenuKey(item.key)
                      setSubmenuOpen(Boolean(SUBMENU_CONFIG[item.key]))
                      setMobileMenuOpen(false)
                    }}
                    suppressHydrationWarning
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {activeSubmenuSections.length > 0 && (
                <div className="space-y-5">
                  {activeSubmenuSections.map((section) => (
                    <div key={section.title} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      {section.eyebrow ? (
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          {section.eyebrow}
                        </p>
                      ) : null}
                      <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{section.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        {section.items.map((item) => (
                          <Link
                            key={item.id}
                            href={item.href}
                            className="inline-flex min-h-[36px] items-center border border-slate-400 bg-slate-50 px-3 py-1.5 text-xs font-black tracking-tight text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
