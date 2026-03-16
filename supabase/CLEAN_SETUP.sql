-- =====================================================
-- CLEAN NEWS CMS SETUP - Copy and paste this entire file
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'author');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE article_status AS ENUM ('draft', 'pending', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create tables
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON public.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slug_history ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "authors_select_all" ON public.authors;
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "tags_select_all" ON public.tags;
DROP POLICY IF EXISTS "articles_select_policy" ON public.articles;
DROP POLICY IF EXISTS "article_tags_select_all" ON public.article_tags;
DROP POLICY IF EXISTS "slug_history_select_all" ON public.slug_history;

-- Create RLS policies
CREATE POLICY "authors_select_all" ON public.authors FOR SELECT USING (true);
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "tags_select_all" ON public.tags FOR SELECT USING (true);
CREATE POLICY "article_tags_select_all" ON public.article_tags FOR SELECT USING (true);
CREATE POLICY "slug_history_select_all" ON public.slug_history FOR SELECT USING (true);

CREATE POLICY "articles_select_policy" ON public.articles
  FOR SELECT USING (
    status = 'published' 
    OR auth.uid() IN (SELECT user_id FROM public.authors WHERE id = author_id)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- Insert demo users and authors
INSERT INTO public.users (id, email, role)
VALUES 
  (gen_random_uuid(), 'demo@ekahnews.com', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.authors (user_id, name, bio)
SELECT 
  id, 
  'Demo Author',
  'Professional journalist and content creator'
FROM public.users WHERE email = 'demo@newscms.com'
ON CONFLICT DO NOTHING;

-- Insert categories
INSERT INTO public.categories (name, slug, description) VALUES
('Technology', 'technology', 'Latest tech news and innovation'),
('Business', 'business', 'Business and finance news'),
('Health', 'health', 'Health and wellness'),
('Science', 'science', 'Scientific discoveries'),
('Sports', 'sports', 'Sports news'),
('Lifestyle', 'lifestyle', 'Lifestyle and culture')
ON CONFLICT (slug) DO NOTHING;

-- Insert tags
INSERT INTO public.tags (name, slug) VALUES
('AI', 'ai'),
('Technology', 'technology'),
('Innovation', 'innovation'),
('Health', 'health'),
('Business', 'business')
ON CONFLICT (slug) DO NOTHING;

-- Insert articles
DO $$
DECLARE
  author_uuid UUID;
  tech_cat UUID;
  business_cat UUID;
  health_cat UUID;
BEGIN
  SELECT id INTO author_uuid FROM public.authors WHERE name = 'Demo Author' LIMIT 1;
  SELECT id INTO tech_cat FROM public.categories WHERE slug = 'technology';
  SELECT id INTO business_cat FROM public.categories WHERE slug = 'business';
  SELECT id INTO health_cat FROM public.categories WHERE slug = 'health';

  INSERT INTO public.articles (title, slug, excerpt, content, category_id, author_id, status, published_at, featured_image_url) VALUES
  (
    'Artificial Intelligence Revolutionizes Healthcare Diagnostics',
    'ai-revolutionizes-healthcare-2025',
    'AI systems are detecting diseases with 98% accuracy, transforming modern medicine.',
    '<h2>The Future of Medicine</h2><p>Artificial intelligence is transforming healthcare with unprecedented diagnostic accuracy. Recent studies show AI tools can detect diseases with 98% accuracy, matching or exceeding human doctors in some cases.</p><h3>Key Benefits</h3><ul><li>98% diagnostic accuracy</li><li>40% faster diagnosis</li><li>35% fewer errors</li><li>Accessible healthcare</li></ul><p>Major hospitals worldwide are implementing AI diagnostic systems with remarkable results.</p>',
    tech_cat, author_uuid, 'published', NOW() - INTERVAL '1 day',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200'
  ),
  (
    'Bitcoin Surpasses $75,000 as Institutions Invest Heavily',
    'bitcoin-surpasses-75000-2025',
    'Cryptocurrency reaches new highs driven by institutional adoption and regulatory clarity.',
    '<h2>Crypto Market Surge</h2><p>Bitcoin has broken through the $75,000 barrier, driven by massive institutional investment and improved regulatory frameworks.</p><h3>Market Data</h3><ul><li>Bitcoin: $75,432 (+127% YoY)</li><li>Market cap: $3.2 trillion</li><li>Daily volume: $142 billion</li><li>Institutional holdings up 250%</li></ul><p>Financial experts predict continued growth as more institutions enter the market.</p>',
    business_cat, author_uuid, 'published', NOW() - INTERVAL '2 days',
    'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200'
  ),
  (
    'New Study: 15-Minute Daily Walks Reduce Heart Disease Risk by 23%',
    'daily-walks-reduce-heart-disease-2025',
    'Groundbreaking research shows even minimal exercise has major health benefits.',
    '<h2>Simple Exercise, Big Results</h2><p>A comprehensive 10-year study shows that just 15 minutes of walking per day can significantly reduce cardiovascular disease risk and improve mental health.</p><h3>Key Findings</h3><ul><li>23% lower heart disease risk</li><li>18% lower depression rates</li><li>Better sleep quality</li><li>Improved cognitive function</li></ul><p>Health experts recommend starting with just 5 minutes and gradually increasing.</p>',
    health_cat, author_uuid, 'published', NOW() - INTERVAL '3 days',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200'
  ),
  (
    'Climate Tech Startups Raise Record $50 Billion in 2024',
    'climate-tech-funding-50-billion-2024',
    'Investment in climate technology reaches unprecedented levels as urgency grows.',
    '<h2>Climate Tech Boom</h2><p>Climate technology startups raised a record-breaking $50 billion in 2024, reflecting growing urgency around climate change and recognition of technological solutions.</p><h3>Investment Areas</h3><ul><li>Carbon capture: $12B</li><li>Renewable storage: $15B</li><li>Alternative proteins: $8B</li><li>Sustainable materials: $7B</li></ul><p>Several breakthrough technologies have reached commercial viability.</p>',
    tech_cat, author_uuid, 'published', NOW() - INTERVAL '4 days',
    'https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=1200'
  ),
  (
    'Remote Work Productivity: Data Shows 13% Increase When Done Right',
    'remote-work-productivity-increase-2025',
    'Analysis of 10,000 companies reveals the secrets of successful remote work.',
    '<h2>Remote Work Success</h2><p>Comprehensive analysis of remote work shows productivity increases by 13% on average when implemented correctly with proper tools and culture.</p><h3>Success Factors</h3><ul><li>Clear communication channels</li><li>Flexible schedules</li><li>Results-focused metrics</li><li>Regular team connection</li></ul><p>Companies that embrace remote work report higher employee satisfaction and retention.</p>',
    business_cat, author_uuid, 'published', NOW() - INTERVAL '5 days',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200'
  ),
  (
    'Mediterranean Diet Linked to 40% Lower Chronic Disease Risk',
    'mediterranean-diet-health-benefits-2025',
    'Largest-ever nutrition study reveals dramatic health benefits of Mediterranean eating.',
    '<h2>Diet and Health</h2><p>A groundbreaking 20-year study of 500,000 participants shows the Mediterranean diet reduces chronic disease risk by up to 40%.</p><h3>Health Benefits</h3><ul><li>40% lower heart disease</li><li>30% lower diabetes risk</li><li>25% lower cancer risk</li><li>Improved longevity</li></ul><p>The diet emphasizes vegetables, fruits, whole grains, fish, and healthy fats.</p>',
    health_cat, author_uuid, 'published', NOW() - INTERVAL '6 days',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200'
  ),
  (
    'SpaceX Announces Accelerated Mars Mission Timeline for 2028',
    'spacex-mars-mission-2028-timeline',
    'First crewed Mars mission moves closer with new Starship capabilities.',
    '<h2>Journey to Mars</h2><p>SpaceX has unveiled an ambitious timeline for the first crewed Mars mission, with new Starship capabilities making 2028 landing feasible.</p><h3>Mission Plan</h3><ul><li>2026: Cargo missions begin</li><li>2027: Test crew missions</li><li>2028: First Mars landing</li><li>Sustainable presence by 2030</li></ul><p>NASA and international partners are collaborating on the historic mission.</p>',
    tech_cat, author_uuid, 'published', NOW() - INTERVAL '7 days',
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200'
  ),
  (
    'Electric Vehicle Sales Hit 35% of Global New Car Market',
    'electric-vehicle-sales-35-percent-2025',
    'EV adoption reaches tipping point as prices fall and infrastructure expands.',
    '<h2>EV Market Boom</h2><p>Electric vehicles now represent 35% of all new car sales globally, driven by falling prices, better range, and expanding charging infrastructure.</p><h3>Market Trends</h3><ul><li>500+ mile range standard</li><li>Price parity with gas cars</li><li>300,000 fast chargers worldwide</li><li>Battery costs down 80%</li></ul><p>Industry analysts predict 60% EV market share by 2027.</p>',
    tech_cat, author_uuid, 'published', NOW() - INTERVAL '8 days',
    'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200'
  ),
  (
    'Sustainable Fashion Industry Reaches $300 Billion Milestone',
    'sustainable-fashion-300-billion-2025',
    'Eco-friendly clothing moves from niche to mainstream as consumer demand soars.',
    '<h2>Fashion Revolution</h2><p>The sustainable fashion market has grown to $300 billion as consumers increasingly demand ethical and environmentally-friendly clothing options.</p><h3>Growth Drivers</h3><ul><li>Consumer awareness up 200%</li><li>Major brands pivot to sustainability</li><li>Circular fashion models</li><li>Transparent supply chains</li></ul><p>The industry expects to double in size by 2027.</p>',
    tech_cat, author_uuid, 'published', NOW() - INTERVAL '9 days',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200'
  ),
  (
    'Olympic Athletes Achieve 23% Performance Boost Using AI Training',
    'olympic-ai-training-performance-boost-2025',
    'Cutting-edge artificial intelligence systems revolutionize athletic preparation.',
    '<h2>AI in Sports</h2><p>Elite athletes preparing for major competitions are using AI to optimize training, achieving measurable 15-23% performance improvements.</p><h3>AI Technologies</h3><ul><li>Computer vision form analysis</li><li>Predictive injury prevention</li><li>Personalized nutrition plans</li><li>Sleep optimization tracking</li></ul><p>National teams worldwide have adopted AI training as a core strategy.</p>',
    tech_cat, author_uuid, 'published', NOW() - INTERVAL '10 days',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200'
  );

END $$;

-- Verify setup
SELECT 'Setup complete! Check counts below:' as message;
SELECT 'Categories' as item, COUNT(*) as count FROM public.categories
UNION ALL
SELECT 'Tags', COUNT(*) FROM public.tags
UNION ALL  
SELECT 'Authors', COUNT(*) FROM public.authors
UNION ALL
SELECT 'Articles', COUNT(*) FROM public.articles
UNION ALL
SELECT 'Published', COUNT(*) FROM public.articles WHERE status = 'published';

