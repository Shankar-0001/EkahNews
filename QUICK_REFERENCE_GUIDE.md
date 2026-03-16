# 📖 Quick Reference Guide

Fast lookup for common tasks after PHASE 10 completion.

---

## 🚀 Quick Start Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Build for production
npm run start                  # Start production server
npm run test                   # Run tests

# Database
npm run seed                   # Seed test data
npm run migrate                # Apply migrations
npm run backup                 # Create database backup

# Deployment
git add .
git commit -m "message"
git push                       # Auto-deploys to Vercel

# Git
git log --oneline              # View recent commits
git diff main                  # See uncommitted changes
git checkout -b feature/name   # Create feature branch
```

---

## 📁 Project Structure Reference

```
app/
├── api/
│   ├── articles/route.js        ← POST create article
│   ├── articles/[id]/route.js   ← PATCH/DELETE article
│   ├── authors/route.js         ← Author CRUD
│   └── media/route.js           ← NEW: Media upload/delete
├── dashboard/
│   ├── articles/                ← Article management
│   ├── media/                   ← NEW: Media library UI
│   └── page.jsx                 ← Dashboard home
├── articles/[slug]/page.jsx     ← Public article page
└── error.jsx                    ← Error boundary

lib/
├── api-utils.js                 ← Standardized responses
├── validation.js                ← Input validation
├── auth-utils.js                ← Auth & permissions
├── image-utils.js               ← Image compression
├── cache-utils.js               ← Caching layer
├── design-system.js             ← Design tokens
├── security-utils.js            ← XSS prevention
└── seo-utils.js                 ← SEO metadata

components/
├── dashboard/
│   ├── DashboardNav.jsx         ← Sidebar navigation
│   └── ArticleActions.jsx       ← Article delete button
└── ui/                          ← shadcn/ui components
```

---

## 🔌 API Endpoints Cheat Sheet

### Articles

```bash
# Create
POST /api/articles
{ "title", "slug", "content", "category_id" }

# Update
PATCH /api/articles/:id
{ "title", "content", ... }

# Delete
DELETE /api/articles/:id

# Get article (client-side)
GET /articles/:slug
```

### Media

```bash
# List
GET /api/media?page=1&limit=20&type=image&search=term

# Upload
POST /api/media
FormData { "file" }

# Delete
DELETE /api/media?id=<media-id>
```

### Tags

```bash
# Add tags to article
POST /api/articles/tags
[{ "article_id", "tag_id" }]

# Remove article tags
DELETE /api/articles/:id/tags
```

---

## 🛡️ Authentication Usage

```javascript
import { getAuthUser, requireAuth, canEditArticle } from '@/lib/auth-utils'

// Get current user
const user = await getAuthUser()
// { userId, email, role }

// Require authentication (throws if not auth'd)
const user = await requireAuth()

// Check if can edit article
const canEdit = await canEditArticle(articleId, user)

// Check admin role
const user = await requireAdmin()
```

---

## 🖼️ Image Handling

```javascript
import { validateImageFile, compressImage } from '@/lib/image-utils'

// Validate
const validation = validateImageFile(file)
if (!validation.valid) {
  console.error(validation.errors)
}

// Compress before upload
const compressed = await compressImage(file, 1920, 1920)
// Result: smaller file, same dimensions
```

---

## 💾 Caching

```javascript
import { getFromCache, setToCache } from '@/lib/cache-utils'

// Get from cache
const articles = getFromCache('articles')

// Set cache (expire in 1 hour = 3600 seconds)
setToCache('articles', data, 3600)

// Available TTL constants
import { CACHE_DURATIONS } from '@/lib/cache-utils'
// CACHE_DURATIONS.ARTICLE = 3600
// CACHE_DURATIONS.CATEGORY = 1800
// CACHE_DURATIONS.MEDIA = 600
```

---

## 🎨 Design System Usage

```javascript
import { 
  COLORS, 
  SPACING, 
  SHADOWS, 
  BUTTON_STYLES,
  CSS_CLASSES 
} from '@/lib/design-system'

// Colors
background: COLORS.primary         // #3b82f6
color: COLORS.text.primary        // #1f2937

// Spacing
padding: SPACING.md               // 16px
gap: SPACING.lg                   // 24px

// Shadows
boxShadow: SHADOWS.elevation1     // Light shadow
borderRadius: SHADOWS.borderRadius // 8px

// Classes (TailwindCSS)
className={CSS_CLASSES.button.primary}
className={CSS_CLASSES.card.default}
```

---

## 🔒 Security

```javascript
import { 
  sanitizeHTML, 
  sanitizeText,
  validateEmail,
  validateURL 
} from '@/lib/security-utils'

// Remove scripts from HTML
const safe = sanitizeHTML('<img src=x onerror="alert(1)">')
// Result: '<img src="x">'

// Escape HTML special chars
const escaped = sanitizeText('Hello & <world>')
// Result: 'Hello &amp; &lt;world&gt;'

// Validate email
const valid = validateEmail('user@example.com')

// Validate URL
const valid = validateURL('https://example.com')
```

---

## 📊 SEO

```javascript
import { 
  generateArticleMetadata,
  generateArticleSchema,
  generateSitemap 
} from '@/lib/seo-utils'

// In articles/[slug]/page.jsx
export const generateMetadata = async ({ params }) => {
  const article = await fetchArticle(params.slug)
  return generateArticleMetadata(article)
}

// Generate JSON-LD schema
const schema = generateArticleSchema(article)
// Use in: <script type="application/ld+json">{schema}</script>

// Generate sitemap
const sitemap = await generateSitemap()
```

---

## 🧪 Testing

```javascript
// Run specific tests
npm run test -- articles.test.js

// Run with coverage
npm run test -- --coverage

// Watch mode (re-run on file changes)
npm run test -- --watch

// Test security
npm audit                         # Check dependencies

// Test accessibility
npx axe http://localhost:3000

// Lighthouse audit
npx lighthouse http://localhost:3000
```

---

## 📈 Performance Tips

### ISR Configuration
```javascript
// In page.jsx
export const revalidate = 600  // 10 minutes
// Page served from cache, revalidated in background
```

### Query Optimization
```javascript
// ✅ Good: Batch load related data
const articles = await supabase
  .from('articles')
  .select('*, authors(*), categories(*)')

// ❌ Bad: N+1 query
for (const article of articles) {
  const author = await supabase  // Repeated queries
    .from('authors')
    .eq('id', article.author_id)
}
```

### Image Optimization
```javascript
// ✅ Good: Use next/image component
import Image from 'next/image'
<Image 
  src={url} 
  alt="title"
  width={1920}
  height={1080}
  quality={85}
/>

// Images auto-optimized at build and request time
```

---

## 🐛 Debugging

### Check Server Logs
```bash
# Vercel
vercel logs --follow

# Self-hosted
pm2 logs EkahNews
```

### Browser DevTools
```
F12 or Cmd+Option+I
- Console: JavaScript errors
- Network: API calls, slow requests
- Performance: Page load waterfall
- Lighthouse: Audit results
```

### Database Debugging
```bash
# Connect to Supabase
psql $DATABASE_URL

# Check error logs
SELECT * FROM pg_logs ORDER BY timestamp DESC LIMIT 10
```

---

## 🔧 Common Fixes

### Clear Cache
```bash
npm run build
npm run start
# Or in code: cleanupExpiredCache()
```

### Reset Database
```sql
-- Delete all articles
DELETE FROM articles CASCADE;

-- Delete all users
DELETE FROM users CASCADE;

-- Re-seed test data
npm run seed
```

### Fix Image Path Issues
```bash
# Images stored at: media/YYYY/MM/DD/filename
# Public URL: https://domain.com/storage/v1/object/public/media/...

# Verify in browser console
console.log(mediaItem.file_url)
```

### Fix Permission Errors
```javascript
// Ensure user has auth
const user = await requireAuth()

// Verify database RLS policies
-- Check Supabase dashboard → Security → Policies
```

---

## 📞 Support Resources

### Official Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [tailwindcss Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

### EkahNews Documentation
- [PHASE_10_PRODUCTION_READINESS.md](./PHASE_10_PRODUCTION_READINESS.md) - Full deployment guide
- [PHASE_10_INTEGRATION_TESTING.js](./tests/PHASE_10_INTEGRATION_TESTING.js) - Test suites
- [PRODUCTION_DEPLOYMENT_COMPLETE.md](./PRODUCTION_DEPLOYMENT_COMPLETE.md) - Initial deployment checklist

### Community
- [Next.js Discussions](https://github.com/vercel/next.js/discussions)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
- [GitHub Issues](https://github.com) - Report bugs

---

## 💡 Pro Tips

1. **Use ISR for slow pages**
   ```javascript
   export const revalidate = 3600  // Cache 1 hour
   ```

2. **Always validate on the server**
   ```javascript
   // API route must validate, don't trust client
   const validation = validateArticle(body)
   if (!validation.valid) return // 400 error
   ```

3. **Compress images immediately**
   ```javascript
   const compressed = await compressImage(file)
   // Don't upload original large file
   ```

4. **Use design tokens, not hardcoded values**
   ```javascript
   // ✅ Good
   color: COLORS.primary
   
   // ❌ Bad
   color: '#3b82f6'
   ```

5. **Log API calls in development**
   ```javascript
   console.log('API Request:', method, endpoint, body)
   console.log('API Response:', status, data)
   ```

6. **Monitor errors in production**
   ```javascript
   import * as Sentry from "@sentry/nextjs"
   Sentry.captureException(error)
   ```

---

## 🎯 Version Info

- **Next.js**: 14.0+
- **React**: 18.0+
- **Supabase**: 2.0+
- **TailwindCSS**: 3.0+
- **Node**: 18.0+

---

## 📝 Changelog

### Recent Updates (PHASE 9-10)

- Media library API with file validation
- Drag-drop UI for media uploads
- Comprehensive testing suite
- Production readiness guide
- This quick reference guide

---

*Last Updated: 2024*  
*EkahNews v1.0-production*

