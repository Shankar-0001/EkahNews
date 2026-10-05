// Public policy: contains no service credentials. Binding is reviewed release configuration.
const binding = require('../deployment-binding.json')
const PROJECTS = Object.freeze({staging:'lxbkxisipoutyyscktcw',production:'bjlohhikzoxzviwmpucv'})
const ORIGINS = Object.freeze({staging:['http://localhost:3000','http://127.0.0.1:3000','http://[::1]:3000'],production:['https://www.ekahnews.com']})
function reject() { throw new Error('Deployment configuration rejected; check target, origin and credential binding') }
function verifyKey(key, ref, role, now = Date.now()) {
  try {
    const parts = key.split('.')
    if (parts.length !== 3 || parts.some(p => !p)) reject()
    const encoded = parts[1].replace(/-/g,'+').replace(/_/g,'/')
    const claims = JSON.parse(atob(encoded))
    if (claims.ref !== ref || claims.role !== role || !Number.isFinite(claims.exp) || claims.exp * 1000 <= now) reject()
  } catch { reject() }
  // Claims bind configuration; the Supabase endpoint still authenticates the signed key.
}
function validatePublicConfig(env, trustedBinding = binding) {
  const target = trustedBinding.target
  if (!Object.hasOwn(PROJECTS,target) || env.NEXT_PUBLIC_APP_ENV !== target) reject()
  const ref = PROJECTS[target], url = 'https://' + ref + '.supabase.co'
  if (env.NEXT_PUBLIC_SUPABASE_URL !== url || !ORIGINS[target].includes(env.NEXT_PUBLIC_BASE_URL)) reject()
  verifyKey(env.NEXT_PUBLIC_SUPABASE_ANON_KEY,ref,'anon')
  if (target === 'staging' && (env.NEXT_PUBLIC_ADS_ENABLED !== 'false' || [env.NEXT_PUBLIC_GA_MEASUREMENT_ID,env.NEXT_PUBLIC_WEB_STORY_AD_NETWORK,env.NEXT_PUBLIC_WEB_STORY_ADSENSE_SLOT,env.NEXT_PUBLIC_WEB_STORY_DOUBLECLICK_SLOT].some(Boolean))) reject()
  return {target,ref,url,origin:env.NEXT_PUBLIC_BASE_URL,noindex:target !== 'production'}
}
function getPublicDeployment() {
  return validatePublicConfig({
    NEXT_PUBLIC_APP_ENV:process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_BASE_URL:process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_ADS_ENABLED:process.env.NEXT_PUBLIC_ADS_ENABLED,
    NEXT_PUBLIC_GA_MEASUREMENT_ID:process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_WEB_STORY_AD_NETWORK:process.env.NEXT_PUBLIC_WEB_STORY_AD_NETWORK,
    NEXT_PUBLIC_WEB_STORY_ADSENSE_SLOT:process.env.NEXT_PUBLIC_WEB_STORY_ADSENSE_SLOT,
    NEXT_PUBLIC_WEB_STORY_DOUBLECLICK_SLOT:process.env.NEXT_PUBLIC_WEB_STORY_DOUBLECLICK_SLOT,
  })
}
module.exports = {PROJECTS,ORIGINS,verifyKey,validatePublicConfig,getPublicDeployment}
