'use client'

import { useMemo } from 'react'
import { ChevronRight, Facebook, Plus, Share2 } from 'lucide-react'
import { absoluteUrl } from '@/lib/site-config'
import { getAnchorPropsForHref } from '@/lib/link-policy'

function XIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M18.244 2H21l-6.06 6.93L22 22h-6.58l-4.93-6.34L4.4 22H1.64l6.5-7.44L2 2h6.7l4.45 5.72L18.244 2zm-1.15 18h1.82L8.9 3.95H7.02L17.094 20z"
      />
    </svg>
  )
}

function GoogleGIcon() {
  return (
    <svg viewBox="0 0 533.5 544.3" className="h-5 w-5" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M533.5 278.4c0-18.5-1.5-37-4.7-54.9H272v103.9h146.9c-6.1 33.3-25.4 61.5-54.1 80.4v66h87.4c51.2-47.1 81.3-116.6 81.3-195.4z" />
      <path fill="#34A853" d="M272 544.3c73.8 0 135.9-24.4 181.2-66.5l-87.4-66c-24.3 16.6-55.4 26.3-93.8 26.3-72 0-133-48.6-154.8-113.9H27.1v71.6C73.4 487.8 166.4 544.3 272 544.3z" />
      <path fill="#FBBC04" d="M117.2 324.2c-10.8-32.3-10.8-67.1 0-99.4V153.2H27.1c-38.9 77.6-38.9 169.3 0 246.9l90.1-71.6z" />
      <path fill="#EA4335" d="M272 107.7c40.1-.6 78.8 14.5 108.4 42.1l81-81C405.8 24.1 342.9-.8 272 0 166.4 0 73.4 56.5 27.1 153.2l90.1 71.6C139 156.3 200 107.7 272 107.7z" />
    </svg>
  )
}

function buildGoogleNewsUrl() {
  return process.env.NEXT_PUBLIC_GOOGLE_NEWS_URL || `https://news.google.com/search?q=${encodeURIComponent('EkahNews')}`
}

export default function ArticleFollowStrip({ articleUrl, articleTitle }) {
  const encodedUrl = useMemo(() => encodeURIComponent(articleUrl || ''), [articleUrl])
  const encodedTitle = useMemo(() => encodeURIComponent(articleTitle || ''), [articleTitle])
  const googleNewsUrl = useMemo(() => buildGoogleNewsUrl(), [])

  const socialLinks = useMemo(() => ({
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL || '',
  }), [])

  const followHref = socialLinks.facebook || socialLinks.twitter || absoluteUrl('/about-us')

  const shareTargets = [
    {
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      label: 'Facebook',
      icon: <Facebook className="h-5 w-5" />,
    },
    {
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      label: 'X',
      icon: <XIcon className="h-5 w-5" />,
    },
  ]

  const openShare = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=640')
  }

  const handleShare = async () => {
    if (navigator.share && articleUrl) {
      try {
        await navigator.share({ title: articleTitle || '', text: articleTitle || '', url: articleUrl })
        return
      } catch {
        // Ignore cancelled share attempts so the strip stays quiet.
      }
    }
  }

  return (
    <div className="ml-auto flex flex-wrap items-stretch gap-3 lg:flex-nowrap lg:shrink-0">
      <a
        href={googleNewsUrl}
        {...getAnchorPropsForHref(googleNewsUrl, { nofollowExternal: false })}
        className="inline-flex h-[40px] w-[190px] items-center justify-between gap-2 rounded-xl border-2 border-black bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        aria-label="Find EkahNews on Google News"
      >
        <span className="inline-flex items-center gap-3">
          <GoogleGIcon />
          <span className="truncate">Preferred source</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </a>

      <a
        href={followHref}
        {...getAnchorPropsForHref(followHref, { nofollowExternal: false })}
        className="inline-flex h-[40px] w-[110px] items-center justify-between gap-2 rounded-xl border-2 border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        aria-label="Follow EkahNews on our official social profile"
      >
        <span className="truncate">Follow us</span>
        <Plus className="h-3.5 w-3.5 shrink-0" />
      </a>

      {shareTargets.map((target) => (
        <a
          key={target.label}
          href={target.href}
          {...getAnchorPropsForHref(target.href, { nofollowExternal: false })}
          className="inline-flex h-[40px] w-[38px] items-center justify-center rounded-xl border-2 border-slate-300 bg-slate-100 text-slate-500 shadow-sm transition-colors hover:bg-slate-200 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          aria-label={`Share ${articleTitle || 'this article'} on ${target.label}`}
        >
          {target.icon}
        </a>
      ))}

      <button
        type="button"
        onClick={handleShare}
        className="inline-flex h-[40px] w-[38px] items-center justify-center rounded-xl border-2 border-slate-300 bg-slate-100 text-slate-500 shadow-sm transition-colors hover:bg-slate-200 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        aria-label="Share this article"
      >
        <Share2 className="h-5 w-5" />
      </button>
    </div>
  )
}
