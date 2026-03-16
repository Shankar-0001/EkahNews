# 📊 DUMMY DATA SETUP GUIDE

## Overview
This guide will help you populate your News CMS with realistic dummy data including:
- 8 Categories
- 20 Tags  
- 8 Sample Articles (5 published, 1 draft, 1 pending, 1 travel)
- Article-Tag relationships

---

## 🚀 STEP-BY-STEP INSTRUCTIONS

### Step 1: Create User Accounts

First, create user accounts via the signup page:

**Go to**: `https://ekahnews.com/signup`

**Create these accounts**:

1. **Admin Account**
   - Email: `admin@newscms.com`
   - Password: `Admin@123456`
   - Name: `Admin User`
   - Role: **Admin**

2. **Author Account 1**
   - Email: `john.smith@newscms.com`
   - Password: `Author@123456`
   - Name: `John Smith`
   - Role: **Author**

3. **Author Account 2** (Optional)
   - Email: `sarah.johnson@newscms.com`
   - Password: `Author@123456`
   - Name: `Sarah Johnson`
   - Role: **Author**

---

### Step 2: Get User IDs

After creating accounts, you need to get the user IDs.

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Copy the UUID for each user

**Option B: Via SQL**
```sql
SELECT id, email FROM auth.users ORDER BY created_at DESC;
```

Copy the UUIDs - you'll need them for the next step.

---

### Step 3: Verify Author Profiles Were Created

Check if author profiles were automatically created:

```sql
SELECT a.id, a.name, a.user_id, u.email 
FROM public.authors a
JOIN public.users u ON a.user_id = u.id;
```

If author profiles exist, **skip to Step 5**.

If no author profiles exist, continue to Step 4.

---

### Step 4: Create Author Profiles (If Needed)

**IMPORTANT**: Replace `YOUR_USER_ID_HERE` with actual UUIDs from Step 2.

```sql
-- For admin@newscms.com
INSERT INTO public.authors (user_id, name, bio) VALUES
('YOUR_ADMIN_USER_ID_HERE', 'Admin User', 'Chief Editor and Administrator of NewsCMS');

-- For john.smith@newscms.com  
INSERT INTO public.authors (user_id, name, bio) VALUES
('YOUR_JOHN_USER_ID_HERE', 'John Smith', 'Technology journalist with 10+ years of experience covering AI, startups, and innovation');

-- For sarah.johnson@newscms.com (Optional)
INSERT INTO public.authors (user_id, name, bio) VALUES
('YOUR_SARAH_USER_ID_HERE', 'Sarah Johnson', 'Senior reporter covering business, finance, and global markets');
```

---

### Step 5: Run the Seed Data SQL

Now run the main seed data file:

**Go to**: Supabase Dashboard → SQL Editor → New Query

**Copy and paste** the contents of: `/app/supabase/seed_data.sql`

**Click**: "Run"

This will create:
- ✅ 8 Categories (Technology, Business, Sports, etc.)
- ✅ 20 Tags (AI, Startups, Olympics, etc.)
- ✅ 8 Articles with full content
- ✅ Article-tag relationships

---

### Step 6: Verify Data Was Created

Run these verification queries:

```sql
-- Check categories
SELECT COUNT(*) as category_count FROM public.categories;
-- Should return: 8

-- Check tags
SELECT COUNT(*) as tag_count FROM public.tags;
-- Should return: 20

-- Check articles
SELECT COUNT(*) as article_count FROM public.articles;
-- Should return: 8

-- Check article status breakdown
SELECT status, COUNT(*) as count 
FROM public.articles 
GROUP BY status;
-- Should show: 5 published, 1 draft, 1 pending

-- View all articles with details
SELECT 
  a.title, 
  a.slug,
  a.status, 
  c.name as category,
  au.name as author,
  a.published_at 
FROM public.articles a 
LEFT JOIN public.categories c ON a.category_id = c.id
LEFT JOIN public.authors au ON a.author_id = au.id
ORDER BY a.created_at DESC;
```

---

## 📝 SAMPLE ARTICLES CREATED

### Published Articles (5):

1. **AI Revolutionizes Healthcare Diagnostics**
   - Category: Technology
   - Tags: AI, Machine Learning, Medicine
   - Featured image included

2. **Tech Startups See Record $120 Billion in Funding**
   - Category: Business
   - Tags: Startups, AI, Cryptocurrency
   - Featured image included

3. **Olympic Athletes Prepare for Paris 2024**
   - Category: Sports
   - Tags: Olympics, Fitness
   - Featured image included

4. **NASA Discovers Potentially Habitable Exoplanet**
   - Category: Science
   - Tags: Space
   - Featured image included

5. **New Study Reveals Benefits of 15-Minute Daily Walks**
   - Category: Health
   - Tags: Fitness, Nutrition
   - Featured image included

6. **Top 10 Hidden Gems in Southeast Asia for 2025**
   - Category: Travel
   - Featured image included

### Draft Article (1):

7. **Summer Blockbuster Season Preview**
   - Category: Entertainment
   - Status: Draft (visible only to author and admin)

### Pending Article (1):

8. **Quantum Computing Breakthrough: IBM Achieves 1000-Qubit**
   - Category: Technology
   - Status: Pending (submitted for review)

---

## 🎨 FEATURED IMAGES

All articles include featured images from Unsplash. These are real, high-quality images that demonstrate:
- ✅ Minimum 1200px width (Google Discover optimized)
- ✅ Relevant to article content
- ✅ Professional photography
- ✅ Properly optimized URLs

---

## 🧪 TESTING SCENARIOS

### Test 1: Public Homepage
1. Visit: `/`
2. You should see: 5-6 published articles
3. Breaking news ticker should rotate
4. Trending sidebar should show articles

### Test 2: Article Page
1. Click any published article
2. You should see:
   - Full article with formatting
   - Author bio at bottom
   - Related articles (if in same category)
   - Breadcrumb navigation
   - Tags

### Test 3: Category Pages
1. Visit: `/category/technology`
2. Should show all tech articles

### Test 4: Admin Dashboard
1. Login as: `admin@newscms.com`
2. Go to: `/dashboard/articles`
3. You should see ALL articles (including draft and pending)
4. Can edit, delete, and publish any article

### Test 5: Author Dashboard
1. Login as: `john.smith@newscms.com`
2. Go to: `/dashboard/articles`
3. You should see only YOUR articles
4. Cannot edit other authors' articles

### Test 6: Search Functionality
1. Use search bar in header
2. Search for: "AI"
3. Should find AI-related articles

---

## 🔧 TROUBLESHOOTING

### Issue: "No articles found"
**Solution**: Make sure at least one author exists before running seed data.

```sql
-- Check authors exist
SELECT * FROM public.authors;
```

### Issue: "Foreign key violation"
**Problem**: Articles reference non-existent author_id  
**Solution**: 
1. Delete failed article inserts
2. Verify authors exist
3. Re-run seed data

```sql
-- Delete all articles to start fresh
DELETE FROM public.articles;
```

### Issue: "Images not loading"
**Problem**: Unsplash URLs might be blocked  
**Solution**: Replace image URLs with your own or use a different CDN

---

## 📊 DATA SUMMARY

After successful setup:

| Type | Count | Status |
|------|-------|--------|
| Categories | 8 | ✅ |
| Tags | 20 | ✅ |
| Articles | 8 | ✅ |
| - Published | 5-6 | ✅ |
| - Draft | 1 | ✅ |
| - Pending | 1 | ✅ |
| Article-Tag Relations | ~15 | ✅ |

---

## 🎯 NEXT STEPS

After adding dummy data:

1. ✅ Test the public homepage
2. ✅ Test article pages
3. ✅ Test search functionality
4. ✅ Test admin dashboard
5. ✅ Test author dashboard
6. ✅ Test role-based access control
7. ✅ Create your own real content
8. ✅ Replace Unsplash images with your own
9. ✅ Customize categories for your niche

---

## 💡 CUSTOMIZATION TIPS

### Add More Articles
Use the article templates in `seed_data.sql` as a guide. Make sure to:
- Set proper `category_id`
- Set correct `author_id`
- Choose appropriate `status` (draft/pending/published)
- Set `published_at` for published articles
- Add featured images (1200px+ width)

### Add More Categories
```sql
INSERT INTO public.categories (name, slug, description) VALUES
('Your Category', 'your-category', 'Description here');
```

### Add More Tags
```sql
INSERT INTO public.tags (name, slug) VALUES
('Tag Name', 'tag-name');
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Admin user created
- [ ] Author user(s) created
- [ ] Author profiles exist in database
- [ ] Categories created (8 total)
- [ ] Tags created (20 total)
- [ ] Articles created (8 total)
- [ ] Article-tag relationships created
- [ ] Homepage shows published articles
- [ ] Article pages display correctly
- [ ] Admin can see all articles
- [ ] Author can see only own articles
- [ ] Search works
- [ ] Categories work

---

**Need Help?**
- Check `/app/PRODUCTION_AUDIT_REPORT.md` for security details
- Check `/app/README.md` for setup instructions
- Verify RLS policies are enabled

**Ready to Go Live?**
1. Replace dummy content with real articles
2. Add your own images
3. Customize categories for your niche
4. Update author bios
5. Configure AdSense (if monetizing)
6. Deploy to Vercel

🎉 Your News CMS is now populated with realistic dummy data!

