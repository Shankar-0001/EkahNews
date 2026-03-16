import Link from 'next/link'
import { Facebook, Instagram, Youtube, Linkedin, Mail } from 'lucide-react'

export default function SiteFooter() {
  return (
    <footer className="bg-gray-900 dark:bg-black text-white mt-12">
      <div className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-3">EkahNews</h3>
            <p className="text-gray-400">Your trusted source for news and insights.</p>
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-300 mb-2">Newsletter</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-md bg-gray-800 text-white placeholder:text-gray-500 border border-gray-700 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="button"
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-700"
                >
                  Subscribe
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Optional: we send weekly highlights.</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/about-us" className="hover:text-white">About</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/editorial-policy" className="hover:text-white">Editorial Policy</Link></li>
              <li><Link href="/corrections-policy" className="hover:text-white">Corrections Policy</Link></li>
              <li><Link href="/advertise" className="hover:text-white">Advertise With Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Resources</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/sitemap.xml" className="hover:text-white">Sitemap</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Follow Us</h4>
            <div className="flex items-center gap-3">
              <Link href="https://facebook.com" aria-label="Facebook" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-sm transition-opacity hover:opacity-90">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="https://twitter.com" aria-label="X" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white shadow-sm transition-opacity hover:opacity-90">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M18.244 2H21l-6.06 6.93L22 22h-6.58l-4.93-6.34L4.4 22H1.64l6.5-7.44L2 2h6.7l4.45 5.72L18.244 2zm-1.15 18h1.82L8.9 3.95H7.02L17.094 20z"
                  />
                </svg>
              </Link>
              <Link href="https://instagram.com" aria-label="Instagram" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#515bd4] text-white shadow-sm transition-opacity hover:opacity-90">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="https://youtube.com" aria-label="YouTube" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF0000] text-white shadow-sm transition-opacity hover:opacity-90">
                <Youtube className="h-5 w-5" />
              </Link>
              <Link href="https://linkedin.com" aria-label="LinkedIn" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-sm transition-opacity hover:opacity-90">
                <Linkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm">
          <p>&copy; 2026 EkahNews. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

