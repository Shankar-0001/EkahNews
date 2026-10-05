import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(new URL('../../package.json', import.meta.url))
const mode = process.argv[2] || 'dev'
if (!['dev', 'build', 'start'].includes(mode)) throw new Error('Unsupported rehearsal mode')
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(root, mode === 'dev', { info() {}, error() {} })
const env = process.env
for (const name of ['EKAH_DEPLOYMENT_ENV','NEXT_PUBLIC_APP_ENV']) {
  if (env[name] && env[name] !== 'staging') throw new Error('Local launcher target conflict')
  env[name] = 'staging'
}
require('./lib/deployment-policy.server.cjs').assertDeploymentTarget()
const ref = 'lxbkxisipoutyyscktcw'
if (env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') !== `https://${ref}.supabase.co`
    || env.NEXT_PUBLIC_BASE_URL !== 'http://localhost:3000') throw new Error('Staging/local origin guard failed')
for (const [name, role] of [['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon'], ['SUPABASE_SERVICE_ROLE_KEY', 'service_role']]) {
  let payload
  try { payload = JSON.parse(Buffer.from(env[name].split('.')[1], 'base64url').toString()) } catch { throw new Error('Configured staging credential format rejected') }
  if (payload.ref !== ref || payload.role !== role || payload.exp * 1000 <= Date.now()) throw new Error('Staging credential identity guard failed')
}
if (env.NEXT_PUBLIC_ADS_ENABLED !== 'false' || env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    || env.NEXT_PUBLIC_WEB_STORY_AD_NETWORK || env.NEXT_PUBLIC_WEB_STORY_ADSENSE_SLOT
    || env.NEXT_PUBLIC_WEB_STORY_DOUBLECLICK_SLOT) throw new Error('Rehearsal integrations must remain disabled')
for (const [name, value] of Object.entries(env)) {
  if (/SUPABASE|DATABASE|POSTGRES/.test(name) && value.includes('bjlohh')) throw new Error('Production environment marker rejected')
}
console.log(`Staging lxbkxi... verified locally; Next.js ${mode}, loopback only.`)
const args = [resolve(root, 'node_modules/next/dist/bin/next'), mode]
if (mode !== 'build') args.push('--hostname', '127.0.0.1', '--port', '3000')
const child = spawn(process.execPath, args, { cwd: root, env: { ...env, NEXT_TELEMETRY_DISABLED: '1', EKAH_REHEARSAL_DIST_DIR: mode === 'dev' ? '.next-rehearsal-dev' : '.next-rehearsal-build' }, stdio: 'inherit' })
child.on('exit', (code) => { process.exitCode = code ?? 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
