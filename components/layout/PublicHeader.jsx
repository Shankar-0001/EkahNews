'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Moon, Sun, Search, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { filterBlockedCategories } from '@/lib/category-utils'

const HIDDEN_MENU_CATEGORY_SLUGS = new Set(['tech-news', 'latest-news'])

export default function PublicHeader({ categories }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const desktopMenuRef = useRef(null)
  const router = useRouter()
  const pathname = usePathname()
  const visibleCategories = filterBlockedCategories(categories || [])
    .filter((category) => !HIDDEN_MENU_CATEGORY_SLUGS.has(category?.slug))

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setMobileMenuOpen(false)
    }
  }

  const scrollDesktopMenu = (direction) => {
    if (!desktopMenuRef.current) return

    desktopMenuRef.current.scrollBy({
      left: direction === 'left' ? -240 : 240,
      behavior: 'smooth',
    })
  }

  const getCategoryHref = (category) => ['web-story', 'web-stories'].includes(category?.slug) ? '/web-stories' : `/category/${category.slug}`
  const isActivePath = (href) => pathname === href
  const desktopMenuLinkClass = (href) =>
    `rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
      isActivePath(href)
        ? 'border-[#d62828] bg-[#fff1f1] text-[#d62828] dark:border-[#d62828] dark:bg-[#3a1212] dark:text-white'
        : 'border-transparent text-slate-700 hover:border-[#d62828]/30 hover:bg-[#fff1f1] hover:text-[#d62828] dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white'
    }`

  const mobileMenuLinkClass = (href) =>
    `rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
      isActivePath(href)
        ? 'border-[#d62828] bg-[#fff1f1] text-[#d62828] dark:border-[#d62828] dark:bg-[#3a1212] dark:text-white'
        : 'border-slate-200 bg-white text-slate-700 hover:border-[#d62828] hover:bg-[#fff5f5] hover:text-[#d62828] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-slate-300/90 bg-slate-50/95 text-slate-950 shadow-sm backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/95 dark:text-white">
      <div className="w-full max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-4 md:grid md:grid-cols-[auto_minmax(0,520px)_auto] md:items-center">
          <Link href="/" className="flex items-center gap-3 shrink-0 md:justify-self-start">
            <div className="leading-tight">
              <span className="block text-[1.9rem] font-black tracking-tight text-slate-900 dark:text-white">
                <span className="text-[#d62828]">Ekah</span>News
              </span>
            </div>
          </Link>

          <div className="hidden md:block md:w-full md:max-w-[520px] md:justify-self-center">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative w-full">
                <Input
                  id="desktop-search"
                  name="q"
                  type="search"
                  placeholder="Search news"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-full border-slate-300 bg-white pl-5 pr-14 text-base text-slate-950 placeholder:text-slate-500 focus-visible:border-[#b4235a] focus-visible:ring-[#b4235a]/30 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus-visible:border-[#d94b7d] dark:focus-visible:ring-[#d94b7d]/30"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full text-slate-700 hover:bg-slate-300 hover:text-[#d62828] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Search"
                >
                  <Search className="h-[18px] w-[18px]" />
                </Button>
              </div>
            </form>
          </div>

          <div className="hidden items-center gap-2 md:flex shrink-0 md:justify-self-end">
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1 h-10 w-10 rounded-full border border-slate-300/80 bg-white/90 text-[#b4235a] hover:bg-slate-200 hover:text-[#8f1d48] dark:border-slate-700 dark:bg-slate-900 dark:text-[#d94b7d] dark:hover:bg-slate-800 dark:hover:text-[#f06b98]"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {mounted && resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
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

        <div className="hidden lg:flex items-center gap-3 border-t border-slate-200/80 py-3 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-ml-1 h-10 w-10 shrink-0 rounded-full border border-slate-300/80 bg-white text-slate-800 shadow-sm hover:bg-slate-200 hover:text-[#d62828] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={() => scrollDesktopMenu('left')}
            aria-label="Scroll menu left"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <nav
            ref={desktopMenuRef}
            className="min-w-0 flex-1 overflow-x-auto scroll-smooth whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex min-w-max items-center gap-1 pr-6">
              <Link
                href="/"
                className={`${desktopMenuLinkClass('/')} px-4 shadow-sm`}
              >
                Home
              </Link>
              {visibleCategories.map((category) => (
                <Link
                  key={category.id}
                  href={getCategoryHref(category)}
                  className={desktopMenuLinkClass(getCategoryHref(category))}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </nav>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-mr-1 h-10 w-10 shrink-0 rounded-full border border-slate-300/80 bg-white text-slate-800 shadow-sm hover:bg-slate-200 hover:text-[#d62828] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            onClick={() => scrollDesktopMenu('right')}
            aria-label="Scroll menu right"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="flex shrink-0 items-center gap-2">
            <form onSubmit={handleSearch} className="xl:hidden">
              <div className="relative w-full max-w-[220px]">
                <Input
                  id="tablet-search"
                  name="q"
                  type="search"
                  placeholder="Search news"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-full border-slate-200 bg-slate-50 pl-4 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#b4235a] focus-visible:ring-[#b4235a]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-visible:border-[#d94b7d] dark:focus-visible:ring-[#d94b7d]/30"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1 h-8 w-8 rounded-full text-slate-500 hover:bg-slate-200 hover:text-[#d62828] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="space-y-4 border-t border-slate-200 py-4 md:hidden dark:border-slate-800">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Input
                  id="mobile-search"
                  name="q"
                  type="search"
                  placeholder="Search news"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-full border-slate-200 bg-slate-50 pl-4 pr-11 text-slate-900 placeholder:text-slate-400 focus-visible:border-[#b4235a] focus-visible:ring-[#b4235a]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus-visible:border-[#d94b7d] dark:focus-visible:ring-[#d94b7d]/30"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1 h-9 w-9 rounded-full text-slate-500 hover:bg-slate-200 hover:text-[#d62828] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <nav className="grid grid-cols-1 gap-2">
              <Link
                href="/"
                className={`${mobileMenuLinkClass('/')} font-semibold`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              {visibleCategories.map((category) => (
                <Link
                  key={category.id}
                  href={getCategoryHref(category)}
                  className={mobileMenuLinkClass(getCategoryHref(category))}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
