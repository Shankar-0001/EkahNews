-- =====================================================
-- COMPLETE_NEWS_CMS_SETUP.sql
-- =====================================================
-- ONE-CLICK COMPLETE SETUP - Just run this entire file
-- This will set up EVERYTHING for your News CMS
-- =====================================================

-- Clean up existing data (CAREFUL - this deletes everything)
-- Comment out these lines if you want to keep existing data
TRUNCATE TABLE public.article_tags CASCADE;
TRUNCATE TABLE public.articles CASCADE;
TRUNCATE TABLE public.slug_history CASCADE;
TRUNCATE TABLE public.media_library CASCADE;
TRUNCATE TABLE public.tags CASCADE;
TRUNCATE TABLE public.categories CASCADE;
TRUNCATE TABLE public.authors CASCADE;
TRUNCATE TABLE public.users CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 1: CREATE ENUMS
-- =====================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'author');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE article_status AS ENUM ('draft', 'pending', 'published');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- STEP 2: CREATE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'author',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  content_json JSONB,
  featured_image_url TEXT,
  author_id UUID NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  status article_status NOT NULL DEFAULT 'draft',
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.slug_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL,
  new_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STEP 3: CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_authors_user_id ON public.authors(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON public.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON public.articles(status, published_at DESC) WHERE status = 'published';

-- =====================================================
-- STEP 4: ENABLE RLS
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slug_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: DROP OLD POLICIES (if they exist)
-- =====================================================

DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "authors_select_all" ON public.authors;
DROP POLICY IF EXISTS "authors_insert_own" ON public.authors;
DROP POLICY IF EXISTS "authors_update_own" ON public.authors;
DROP POLICY IF EXISTS "authors_delete_admin" ON public.authors;
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_update_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
DROP POLICY IF EXISTS "tags_select_all" ON public.tags;
DROP POLICY IF EXISTS "tags_insert_authenticated" ON public.tags;
DROP POLICY IF EXISTS "tags_update_admin" ON public.tags;
DROP POLICY IF EXISTS "tags_delete_admin" ON public.tags;
DROP POLICY IF EXISTS "articles_select_policy" ON public.articles;
DROP POLICY IF EXISTS "articles_insert_authors" ON public.articles;
DROP POLICY IF EXISTS "articles_update_policy" ON public.articles;
DROP POLICY IF EXISTS "articles_delete_policy" ON public.articles;
DROP POLICY IF EXISTS "article_tags_select_all" ON public.article_tags;
DROP POLICY IF EXISTS "article_tags_manage_authors" ON public.article_tags;
DROP POLICY IF EXISTS "media_select_all" ON public.media_library;
DROP POLICY IF EXISTS "media_insert_authenticated" ON public.media_library;
DROP POLICY IF EXISTS "media_delete_own_or_admin" ON public.media_library;
DROP POLICY IF EXISTS "slug_history_select_all" ON public.slug_history;
DROP POLICY IF EXISTS "slug_history_insert_system" ON public.slug_history;

-- =====================================================
-- STEP 6: CREATE RLS POLICIES
-- =====================================================

-- Users
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Authors
CREATE POLICY "authors_select_all" ON public.authors FOR SELECT USING (true);
CREATE POLICY "authors_insert_own" ON public.authors FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.users));
CREATE POLICY "authors_update_own" ON public.authors FOR UPDATE USING (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
CREATE POLICY "authors_delete_admin" ON public.authors FOR DELETE USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Categories
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_admin" ON public.categories FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
CREATE POLICY "categories_update_admin" ON public.categories FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
CREATE POLICY "categories_delete_admin" ON public.categories FOR DELETE USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Tags
CREATE POLICY "tags_select_all" ON public.tags FOR SELECT USING (true);
CREATE POLICY "tags_insert_authenticated" ON public.tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tags_update_admin" ON public.tags FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));
CREATE POLICY "tags_delete_admin" ON public.tags FOR DELETE USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Articles (CRITICAL - prevents draft leakage)
CREATE POLICY "articles_select_policy" ON public.articles
  FOR SELECT USING (
    status = 'published' 
    OR auth.uid() IN (SELECT user_id FROM public.authors WHERE id = author_id)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

CREATE POLICY "articles_insert_authors" ON public.articles
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.authors WHERE id = author_id));

CREATE POLICY "articles_update_policy" ON public.articles
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.authors WHERE id = author_id)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

CREATE POLICY "articles_delete_policy" ON public.articles
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.authors WHERE id = author_id)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- Article Tags
CREATE POLICY "article_tags_select_all" ON public.article_tags FOR SELECT USING (true);
CREATE POLICY "article_tags_manage_authors" ON public.article_tags FOR ALL USING (
    auth.uid() IN (
      SELECT au.user_id FROM public.articles a
      JOIN public.authors au ON a.author_id = au.id
      WHERE a.id = article_id
    )
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- Media
CREATE POLICY "media_select_all" ON public.media_library FOR SELECT USING (true);
CREATE POLICY "media_insert_authenticated" ON public.media_library FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "media_delete_own_or_admin" ON public.media_library FOR DELETE USING (
    auth.uid() = uploaded_by
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- Slug History
CREATE POLICY "slug_history_select_all" ON public.slug_history FOR SELECT USING (true);
CREATE POLICY "slug_history_insert_system" ON public.slug_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- STEP 7: INSERT DEMO USER AND AUTHOR
-- =====================================================

-- Create a demo user (this will be used for sample articles)
INSERT INTO public.users (id, email, role)
VALUES 
  (gen_random_uuid(), 'demo@newscms.com', 'admin'),
  (gen_random_uuid(), 'author@newscms.com', 'author')
ON CONFLICT (email) DO NOTHING;

-- Create demo authors
INSERT INTO public.authors (user_id, name, bio)
SELECT 
  id, 
  'Admin Demo',
  'Chief Editor of EkahNews with 15 years of journalism experience'
FROM public.users WHERE email = 'demo@newscms.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.authors (user_id, name, bio)
SELECT 
  id,
  'Sarah Johnson',
  'Senior technology reporter specializing in AI and innovation'
FROM public.users WHERE email = 'author@newscms.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 8: INSERT CATEGORIES
-- =====================================================

INSERT INTO public.categories (name, slug, description) VALUES
('Technology', 'technology', 'Latest tech news, AI, gadgets, and innovation'),
('Business', 'business', 'Business news, markets, and entrepreneurship'),
('Health', 'health', 'Health, wellness, and medical breakthroughs'),
('Science', 'science', 'Scientific discoveries and research'),
('Sports', 'sports', 'Sports news and highlights'),
('Lifestyle', 'lifestyle', 'Lifestyle, travel, and culture')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- STEP 9: INSERT TAGS
-- =====================================================

INSERT INTO public.tags (name, slug) VALUES
('AI', 'ai'),
('Machine Learning', 'machine-learning'),
('Blockchain', 'blockchain'),
('Cryptocurrency', 'cryptocurrency'),
('Startup', 'startup'),
('Innovation', 'innovation'),
('Health', 'health'),
('Fitness', 'fitness'),
('Space', 'space'),
('Climate', 'climate')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- STEP 10: INSERT 10 PUBLISHED ARTICLES
-- =====================================================

-- Get the demo author ID
DO $$
DECLARE
  demo_author_id UUID;
  tech_cat_id UUID;
  business_cat_id UUID;
  health_cat_id UUID;
  science_cat_id UUID;
  sports_cat_id UUID;
  lifestyle_cat_id UUID;
BEGIN
  -- Get author and category IDs
  SELECT id INTO demo_author_id FROM public.authors WHERE name = 'Admin Demo' LIMIT 1;
  SELECT id INTO tech_cat_id FROM public.categories WHERE slug = 'technology';
  SELECT id INTO business_cat_id FROM public.categories WHERE slug = 'business';
  SELECT id INTO health_cat_id FROM public.categories WHERE slug = 'health';
  SELECT id INTO science_cat_id FROM public.categories WHERE slug = 'science';
  SELECT id INTO sports_cat_id FROM public.categories WHERE slug = 'sports';
  SELECT id INTO lifestyle_cat_id FROM public.categories WHERE slug = 'lifestyle';

  -- Article 1: AI in Healthcare
  INSERT INTO public.articles (
    title, slug, excerpt, content, category_id, author_id, status, seo_title, seo_description, published_at, featured_image_url
  ) VALUES (
    'Artificial Intelligence Transforms Modern Healthcare',
    'ai-transforms-modern-healthcare-2025',
    'Revolutionary AI systems are now detecting diseases with 98% accuracy, transforming healthcare worldwide.',
    '<h2>The Healthcare Revolution</h2><p>Artificial intelligence has achieved unprecedented accuracy in medical diagnostics. Recent studies show AI diagnostic tools now match or exceed human doctor accuracy.</p><h3>Key Breakthroughs</h3><ul><li>98% accuracy in cancer detection</li><li>40% faster diagnosis times</li><li>35% reduction in errors</li><li>100x faster image processing</li></ul><p>Major hospitals worldwide have implemented AI systems with remarkable results.</p>',
    tech_cat_id, demo_author_id, 'published',
    'AI in Healthcare 2025: 98% Diagnostic Accuracy Achieved',
    'Discover how artificial intelligence is transforming healthcare with revolutionary diagnostic accuracy and faster treatment.',
    NOW() - INTERVAL '2 days',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200'
  );

  -- Article 2: Cryptocurrency
  INSERT INTO public.articles (
    title, slug, excerpt, content, category_id, author_id, status, seo_title, seo_description, published_at, featured_image_url
  ) VALUES (
    'Bitcoin Surpasses $75,000: What Investors Need to Know',
    'bitcoin-surpasses-75000-investor-guide',
    'Bitcoin reaches new all-time highs as institutional adoption accelerates in 2025.',
    '<h2>The Crypto Boom</h2><p>Bitcoin has surpassed $75,000 for the first time, driven by institutional adoption and regulatory clarity.</p><h3>Market Analysis</h3><ul><li>Bitcoin: $75,432 (+127% YoY)</li><li>Ethereum: $4,892 (+156% YoY)</li><li>Total market cap: $3.2 trillion</li></ul><p>Major financial institutions have significantly increased their cryptocurrency exposure.</p>',
    business_cat_id, demo_author_id, 'published',
    'Bitcoin Hits $75K: Complete 2025 Investor Guide',
    'Bitcoin reaches $75,000 as institutions invest heavily. Expert analysis and investment strategies for 2025.',
    NOW() - INTERVAL '1 day',
    'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200'
  );

  -- Article 3: Mental Health
  INSERT INTO public.articles (
    title, slug, excerpt, content, category_id, author_id, status, seo_title, seo_description, published_at, featured_image_url
  ) VALUES (
    'Mental Health at Work: Evidence-Based Strategies',
    'mental-health-work-strategies-2025',
    'New research reveals practical mental health strategies that boost wellbeing by 65%.',
    '<h2>Workplace Mental Health</h2><p>Mental health challenges affect 78% of employees. However, new research shows effective interventions dramatically improve wellbeing.</p><h3>Key Strategies</h3><ul><li>Flexible work arrangements</li><li>Regular check-ins</li><li>Mindfulness programs</li><li>Mental health days</li></ul><p>Companies investing in mental health see $4 return for every $1 spent.</p>',
    health_cat_id, demo_author_id, 'published',
    'Workplace Mental Health: Proven Strategies That Work',
    'Evidence-based mental health strategies boost employee wellbeing by 65%. Learn what works for modern workplaces.',
    NOW() - INTERVAL '6 hours',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200'
  );

  -- Article 4: Climate Tech
  INSERT INTO public.articles (
    title, slug, excerpt, content, category_id, author_id, status, seo_title, seo_description, published_at, featured_image_url
  ) VALUES (
    'Climate Tech Startups Raise Record $50 Billion',
    'climate-tech-funding-50-billion-2025',
    'Investment in climate technology reaches historic highs with breakthrough carbon capture solutions.',
    '<h2>The Climate Tech Boom</h2><p>Climate technology startups raised $50 billion in 2024, reflecting urgent climate action needs.</p><h3>Investment Areas</h3><ul><li>Carbon Capture: $12B</li><li>Renewable Storage: $15B</li><li>Alternative Proteins: $8B</li><li>Sustainable Materials: $7B</li></ul><p>Several technologies have reached commercial viability this year.</p>',
    science_cat_id, demo_author_id, 'published',
    'Climate Tech Investment Hits $50B: Breakthrough Solutions',
    'Climate tech startups raise record $50B. Discover breakthrough carbon capture and renewable energy technologies.',
    NOW() - INTERVAL '12 hours',
    'https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=1200'
  );

  -- Article 5: Olympics AI
  INSERT INTO public.articles (
    title, slug, excerpt, content, category_id, author_id, status, seo_title, seo_description, published_at, featured_image_url
  ) VALUES (
    'Olympic Athletes Use AI Training for 23% Performance Boost',
    'olympic-athletes-ai-training-boost',
    'Cutting-edge AI systems help Olympic athletes achieve unprecedented performance gains.',
    '<h2>AI in Sports Training</h2><p>Elite athletes using AI training systems show 15-23% performance improvements across various metrics.</p><h3>AI Technologies</h3><ul><li>Computer vision analysis</li><li>Predictive injury prevention</li><li>Personalized nutrition</li><li>Sleep optimization</li></ul><p>Team USA has made AI training central to Paris 2025 preparation.</p>',
    sports_cat_id, demo_author_id, 'published',
    'AI Training for Olympics 2025: 23% Performance Gain',
    'Olympic athletes achieve 23% performance boost using AI training. Discover the technology behind Paris 2025 prep.',
    NOW() - INTERVAL '18 hours',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200'
  );

  -- Article 6-10: Additional articles
  INSERT INTO public.articles (title, slug, excerpt, content, category_id, author_id, status, published_at, featured_image_url) VALUES
  (
    'Remote Work Productivity Increases 13% With Right Strategy',
    'remote-work-productivity-increase-2025',
    'Analysis of 10,000 companies reveals remote work boosts productivity when implemented correctly.',
    '<h2>Remote Work Analysis</h2><p>Comprehensive study shows remote work increases productivity by 13% on average.</p><ul><li>Better work-life balance</li><li>Reduced commute stress</li><li>Flexible schedules</li><li>Focus time</li></ul>',
    business_cat_id, demo_author_id, 'published', NOW() - INTERVAL '1 day', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200'
  ),
  (
    'Mediterranean Diet Reduces Chronic Disease Risk by 40%',
    'mediterranean-diet-health-benefits-2025',
    'Largest-ever study shows dramatic health benefits from Mediterranean diet.',
    '<h2>Diet Study Results</h2><p>20-year study reveals Mediterranean diet reduces chronic disease risk significantly.</p><ul><li>40% lower heart disease</li><li>30% lower diabetes</li><li>25% lower cancer risk</li></ul>',
    health_cat_id, demo_author_id, 'published', NOW() - INTERVAL '2 days', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200'
  ),
  (
    'SpaceX Announces First Mars Mission Timeline for 2028',
    'spacex-mars-mission-timeline-2028',
    'SpaceX reveals accelerated timeline for first crewed Mars mission.',
    '<h2>Mars Mission Timeline</h2><p>SpaceX announces ambitious yet achievable Mars mission timeline.</p><ul><li>2026: Cargo missions</li><li>2028: First crew</li><li>New Starship ready</li></ul>',
    science_cat_id, demo_author_id, 'published', NOW() - INTERVAL '3 days', 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200'
  ),
  (
    'Sustainable Fashion Market Reaches $300 Billion',
    'sustainable-fashion-market-300-billion',
    'Sustainable fashion explodes as consumers demand ethical clothing.',
    '<h2>Fashion Transformation</h2><p>Sustainable fashion moves from niche to mainstream market.</p><ul><li>$300B market size</li><li>45% annual growth</li><li>Major brands pivot</li></ul>',
    lifestyle_cat_id, demo_author_id, 'published', NOW() - INTERVAL '4 days', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200'
  ),
  (
    'Electric Vehicles Hit 35% of New Car Sales Globally',
    'electric-vehicles-35-percent-sales-2025',
    'EV adoption reaches tipping point with falling prices and better infrastructure.',
    '<h2>EV Market Boom</h2><p>Electric vehicle sales surge to record highs worldwide.</p><ul><li>35% of new sales</li><li>500+ mile range</li><li>Price parity achieved</li></ul>',
    tech_cat_id, demo_author_id, 'published', NOW() - INTERVAL '5 days', 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200'
  );

  -- Link articles to tags
  INSERT INTO public.article_tags (article_id, tag_id)
  SELECT a.id, t.id
  FROM public.articles a
  CROSS JOIN public.tags t
  WHERE (a.slug = 'ai-transforms-modern-healthcare-2025' AND t.slug IN ('ai', 'machine-learning', 'health'))
     OR (a.slug = 'bitcoin-surpasses-75000-investor-guide' AND t.slug IN ('cryptocurrency', 'blockchain'))
     OR (a.slug = 'mental-health-work-strategies-2025' AND t.slug IN ('health'))
     OR (a.slug = 'climate-tech-funding-50-billion-2025' AND t.slug IN ('climate', 'innovation'))
     OR (a.slug = 'olympic-athletes-ai-training-boost' AND t.slug IN ('ai', 'fitness'))
  ON CONFLICT DO NOTHING;

END $$;

-- =====================================================
-- STEP 11: STORAGE BUCKET (run separately if needed)
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 12: VERIFICATION
-- =====================================================

-- Check created data
SELECT 'Categories' as item, COUNT(*) as count FROM public.categories
UNION ALL
SELECT 'Tags', COUNT(*) FROM public.tags
UNION ALL
SELECT 'Authors', COUNT(*) FROM public.authors
UNION ALL
SELECT 'Articles', COUNT(*) FROM public.articles
UNION ALL
SELECT 'Published Articles', COUNT(*) FROM public.articles WHERE status = 'published';

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- You should now see:
-- - 6 categories
-- - 10 tags
-- - 2 authors
-- - 10 published articles
-- 
-- Visit your homepage to see the articles!
-- =====================================================
