const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('next/dist/compiled/babel/core')

const root = path.resolve(__dirname, '..')

// Execute the actual metadata functions without rendering JSX or contacting Supabase.
function declaration(file, name) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const ast = babel.parseSync(source, {
    babelrc: false, configFile: false, sourceType: 'module',
    parserOpts: { plugins: ['jsx'] },
  })
  for (const entry of ast.program.body) {
    const node = entry.type === 'ExportNamedDeclaration' ? entry.declaration : entry
    if (node?.type === 'FunctionDeclaration' && node.id.name === name) {
      return source.slice(node.start, node.end)
    }
  }
  throw new Error(`Missing ${name} in ${file}`)
}

const absoluteUrlSource = declaration('lib/site-config.js', 'absoluteUrl')
const pages = ['editorial-policy', 'corrections-policy', 'advertise', 'about-us', 'contact', 'privacy-policy', 'terms-of-service']

for (const origin of ['https://www.ekahnews.com', 'http://localhost:3000']) {
  for (const slug of pages) {
    test(`${slug}: canonical follows approved origin ${origin} independently of CMS overrides`, async () => {
      for (const override of [null, { seo_title: 'Edited title', seo_description: 'Edited description', canonical_url: 'https://untrusted.invalid/' }]) {
        const context = vm.createContext({
          SITE_URL: origin,
          IS_NON_INDEXABLE_SITE: origin.startsWith('http://localhost'),
          getStaticPageDefinition: () => ({ seoTitle: 'Default title', seoDescription: 'Default description' }),
          getStaticPageOverride: async () => override,
          generatePrivacyMetadata: async () => ({ title: 'Privacy', alternates: { canonical: origin + '/privacy' } }),
          generateTermsMetadata: async () => ({ title: 'Terms', alternates: { canonical: origin + '/terms' } }),
        })
        vm.runInContext(absoluteUrlSource + '\n' + declaration(`app/${slug}/page.jsx`, 'generateMetadata'), context)
        const metadata = await vm.runInContext('generateMetadata()', context)
        assert.equal(metadata.alternates.canonical, `${origin}/${slug}`)
        if (!['privacy-policy', 'terms-of-service'].includes(slug)) {
          assert.equal(metadata.title, override?.seo_title || 'Default title')
          assert.equal(metadata.description, override?.seo_description || 'Default description')
        }
      }
    })
  }
}
