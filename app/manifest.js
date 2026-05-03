export default function manifest() {
  return {
    name: 'EkahNews',
    short_name: 'EkahNews',
    description: 'Breaking technology, science and world news',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
