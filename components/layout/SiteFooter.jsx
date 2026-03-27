'use client'

import Link from 'next/link'
import { ArrowRight, Facebook, Instagram, Youtube, Linkedin, Mail, Sparkles } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { getPublicationSocialProfiles } from '@/lib/site-config'

export default function SiteFooter() {
  const pathname = usePathname() || ''
  const isAmpStoryPath = pathname.startsWith('/web-stories/') && pathname !== '/web-stories'

  if (isAmpStoryPath) {
    return null
  }

  const socialLinks = {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL,
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL,
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL,
    linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL,
  }
  const hasSocialLinks = getPublicationSocialProfiles().length > 0

  return (
    <footer className="mt-16 border-t border-slate-200 bg-[linear-gradient(180deg,_#0f172a_0%,_#020617_100%)] text-white dark:bg-black">
      <div className="w-full max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8 border border-white/10 bg-white/5 p-5 md:p-6 backdrop-blur-sm">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div>
                  <h3 className="text-[1.9rem] font-black tracking-tight text-white">
                    <span className="text-[#d62828]">Ekah</span>News
                  </h3>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Modern Newsroom</p>
                </div>
              </div>
              <p className="max-w-2xl text-slate-300 leading-7">
                Trusted reporting, explainers, trending topics, and web stories presented with a cleaner digital-first newsroom experience.
              </p>
            </div>

            <div className="border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center gap-2 mb-3 text-cyan-300">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.24em]">Newsletter</p>
              </div>
              <p className="text-sm text-slate-300 mb-4">Newsletter signup is coming soon. For now, reach out through our contact page for updates.</p>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    disabled
                    className="w-full rounded-full bg-white/70 text-slate-900 placeholder:text-slate-500 border border-white/30 pl-9 pr-3 py-3 text-sm cursor-not-allowed"
                  />
                </div>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-700"
                >
                  Contact Us
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="text-xs text-slate-500 mt-3"></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold mb-3 text-white">About</h4>
            <p className="text-slate-400 text-sm leading-6">
              EkahNews focuses on readable, credible, and fast-moving coverage across major categories.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/about-us" className="hover:text-white">About</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/editorial-policy" className="hover:text-white">Editorial Policy</Link></li>
              <li><Link href="/corrections-policy" className="hover:text-white">Corrections Policy</Link></li>
              <li><Link href="/advertise" className="hover:text-white">Advertise With Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Resources</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link href="/sitemap.xml" className="hover:text-white">Sitemap</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Follow Us</h4>
            {hasSocialLinks ? (
              <div className="flex items-center gap-3">
              {socialLinks.facebook && (
              <Link href={socialLinks.facebook} aria-label="Facebook" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-sm transition-opacity hover:opacity-90">
                <Facebook className="h-5 w-5" />
              </Link>
              )}
              {socialLinks.twitter && (
              <Link href={socialLinks.twitter} aria-label="X" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white shadow-sm transition-opacity hover:opacity-90">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M18.244 2H21l-6.06 6.93L22 22h-6.58l-4.93-6.34L4.4 22H1.64l6.5-7.44L2 2h6.7l4.45 5.72L18.244 2zm-1.15 18h1.82L8.9 3.95H7.02L17.094 20z"
                  />
                </svg>
              </Link>
              )}
              {socialLinks.instagram && (
              <Link href={socialLinks.instagram} aria-label="Instagram" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#515bd4] text-white shadow-sm transition-opacity hover:opacity-90">
                <Instagram className="h-5 w-5" />
              </Link>
              )}
              {socialLinks.youtube && (
              <Link href={socialLinks.youtube} aria-label="YouTube" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF0000] text-white shadow-sm transition-opacity hover:opacity-90">
                <Youtube className="h-5 w-5" />
              </Link>
              )}
              {socialLinks.linkedin && (
              <Link href={socialLinks.linkedin} aria-label="LinkedIn" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-sm transition-opacity hover:opacity-90">
                <Linkedin className="h-5 w-5" />
              </Link>
              )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 leading-6">
                Official social profiles will appear here once they are configured.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm">
          <p>&copy; 2026 EkahNews. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
