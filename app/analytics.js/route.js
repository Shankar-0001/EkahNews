export function GET(request) {
  const measurementId = new URL(request.url).searchParams.get('id') || ''
  const body = `(function(){try{if(!${JSON.stringify(measurementId)}||typeof window.gtag!=='function'){return;}window.dataLayer=window.dataLayer||[];window.gtag('js',new Date());window.gtag('config',${JSON.stringify(measurementId)});}catch(_error){}})();`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
