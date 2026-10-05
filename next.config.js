const deployment = require('./lib/deployment-policy.server.cjs').assertDeploymentTarget()
const fs = require('fs')
const path = require('path')
const rehearsalDist = process.env.EKAH_REHEARSAL_DIST_DIR
if (rehearsalDist && !['.next-rehearsal-dev','.next-rehearsal-build'].includes(rehearsalDist)) throw new Error('Unsupported rehearsal output directory')
const distDir = rehearsalDist || '.next'

function findPolyfillsChunkTarget() {
  try {
    const chunkDir = path.join(process.cwd(), distDir, 'static', 'chunks')
    const entry = fs
      .readdirSync(chunkDir)
      .find((name) => /^polyfills-[^.]+\.js$/.test(name))

    return entry
      ? `/_next/static/chunks/${entry}`
      : '/next-polyfills-fallback.js'
  } catch {
    return '/next-polyfills-fallback.js'
  }
}

function buildCsp() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : ''
  const supabaseWsOrigin = supabaseOrigin
    ? supabaseOrigin.replace(/^https/, 'wss').replace(/^http/, 'ws')
    : ''
  const isDev = process.env.NODE_ENV !== 'production'
  let isHttpLoopback = false
  try {
    const baseUrl = new URL(process.env.NEXT_PUBLIC_BASE_URL || '')
    isHttpLoopback = baseUrl.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname)
  } catch {
    // Keep upgrades enabled when the configured base URL is missing or invalid.
  }
  const connectSrc = [
    "'self'",
    supabaseOrigin,
    supabaseWsOrigin,
    'https://cdn.ampproject.org',
    'https://*.ampproject.org',
    'https://analytics.google.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.google.com',
    'https://*.gstatic.com',
    'https://*.googleadservices.com',
    'https://googletagmanager.com',
    'https://www.googletagmanager.com',
    'https://*.googletagmanager.com',
    'https://region1.google-analytics.com',
    'https://www.google.com',
    'https://ampcid.google.com',
    'https://pagead2.googlesyndication.com',
    'https://*.googlesyndication.com',
    'https://stats.g.doubleclick.net',
    'https://*.doubleclick.net',
    'https://*.g.doubleclick.net',
    'https://googleads.g.doubleclick.net',
    isDev ? 'http://localhost:3000' : '',
    isDev ? 'http://127.0.0.1:3000' : '',
    isDev ? 'ws://localhost:3000' : '',
    isDev ? 'ws://127.0.0.1:3000' : '',
  ].filter(Boolean).join(' ')
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    isDev ? "'unsafe-eval'" : '',
    'https://cdn.ampproject.org',
    'https://www.googletagmanager.com',
    'https://pagead2.googlesyndication.com',
    'https://www.google-analytics.com',
    'https://partner.googleadservices.com',
    'https://www.googlesyndication.com',
  ].filter(Boolean).join(' ')

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    `script-src ${scriptSrc}`,
    `script-src-elem ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    'connect-src ' + connectSrc,
    "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    ...(isHttpLoopback ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

const nextConfig = {
  distDir,
  output: 'standalone',
  trailingSlash: false,
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bjlohhikzoxzviwmpucv.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/avif', 'image/webp'],
    qualities: [75],
    minimumCacheTTL: 60,
  },
  experimental: {
    optimizeCss: true,
    serverComponentsExternalPackages: ['mongodb'],
  },
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules'],
      }
    }
    return config
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/_next/static/chunks/polyfills.js',
          destination: findPolyfillsChunkTarget(),
        },
      ],
    }
  },
  async headers() {
    const headers = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: buildCsp() },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
    ]

    let isLocalSite = false
    try { isLocalSite = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.NEXT_PUBLIC_BASE_URL || '').hostname) } catch {}
    if (deployment.noindex) headers.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' })
    if (process.env.NODE_ENV === 'production' && !isLocalSite) {
      headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' })
    }

    return [
      {
        source: '/(.*)',
        headers: [
          ...headers,
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
      {
        source: '/news-sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=7200' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'ekahnews.com' }],
        destination: 'https://www.ekahnews.com/:path*',
        permanent: true,
      },
      {
        source: '/category/tech-news',
        destination: '/category/technology',
        permanent: true,
      },
      {
        source: '/category/tech-news/:path*',
        destination: '/category/technology/:path*',
        permanent: true,
      },
      {
        source: '/category/latest-news',
        destination: '/news',
        permanent: false,
      },
      {
        source: '/privacy',
        destination: '/privacy-policy',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/terms-of-service',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
