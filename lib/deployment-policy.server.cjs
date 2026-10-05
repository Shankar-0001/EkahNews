const binding = require('../deployment-binding.json')
const {validatePublicConfig,verifyKey,PROJECTS} = require('./deployment-policy.cjs')
function reject() { throw new Error('Server deployment configuration rejected') }
function validateServerConfig(env, trustedBinding = binding) {
  const config = validatePublicConfig(env,trustedBinding)
  if (env.EKAH_DEPLOYMENT_ENV !== config.target) reject()
  if (env.SUPABASE_URL && env.SUPABASE_URL !== config.url) reject()
  // Split libpq settings are unused by the web runtime; never allow hidden overrides.
  if (['PGHOST','PGHOSTADDR','PGPORT','PGDATABASE','PGUSER','PGSERVICE','PGSERVICEFILE','PGPASSFILE','PGPASSWORD','POSTGRES_HOST','POSTGRES_USER','POSTGRES_DATABASE'].some(name => env[name])) reject()
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  verifyKey(serviceKey,config.ref,'service_role')
  for (const name of ['SUPABASE_SERVICE_ROLE','SUPABASE_SERVICE_KEY']) if (env[name] && env[name] !== serviceKey) reject()
  for (const [name,value] of Object.entries(env)) {
    if (!value || !/SUPABASE|DATABASE|POSTGRES|^PG/.test(name)) continue
    const otherRef = PROJECTS[config.target === 'staging' ? 'production' : 'staging']
    if (value.includes(otherRef)) reject()
    if (/(DATABASE_URL|DB_URL|POSTGRES.*URL)$/.test(name)) {
      let parsed
      try { parsed = new URL(value) } catch { reject() }
      if (!['postgres:','postgresql:'].includes(parsed.protocol) || parsed.pathname !== '/postgres' || parsed.hash) reject()
      const direct = parsed.hostname === 'db.' + config.ref + '.supabase.co' && decodeURIComponent(parsed.username) === 'postgres'
      const pooler = /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(parsed.hostname) && decodeURIComponent(parsed.username) === 'postgres.' + config.ref
      if ((!direct && !pooler) || [...parsed.searchParams.keys()].some(k => !['sslmode','connect_timeout','pgbouncer'].includes(k))) reject()
    }
  }
  if (config.target === 'staging' && (env.RESEND_API_KEY || env.CRON_SECRET)) reject()
  return config
}
function assertDeploymentTarget() { return validateServerConfig(process.env) }
module.exports = {validateServerConfig,assertDeploymentTarget}
