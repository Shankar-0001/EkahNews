-- =====================================================
-- FINAL_PRODUCTION_SUPABASE_SETUP.sql
-- =====================================================
-- Complete production-ready database setup
-- Run this ONCE in Supabase SQL Editor
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 1: DROP EXISTING POLICIES (Clean slate)
-- =====================================================

-- Drop all existing policies to recreate them properly
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: CREATE OR UPDATE ENUMS
-- =====================================================

-- User role enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'author');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Article status enum (includes pending + archived for workflow)
DO $$ BEGIN
    CREATE TYPE article_status AS ENUM ('draft', 'pending', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE article_status ADD VALUE IF NOT EXISTS 'archived';

-- =====================================================
-- STEP 3: CREATE TABLES (IF NOT EXISTS)
-- =====================================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'author',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Authors table
CREATE TABLE IF NOT EXISTS public.authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  email TEXT,
  title TEXT,
  bio TEXT,
  avatar_url TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Articles table
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  content_json JSONB,
  featured_image_url TEXT,
  featured_image_alt TEXT,
  author_id UUID NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  status article_status NOT NULL DEFAULT 'draft',
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Article tags junction table
CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Media library table
CREATE TABLE IF NOT EXISTS public.media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Slug history table for 301 redirects
CREATE TABLE IF NOT EXISTS public.slug_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL,
  new_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_authors_user_id ON public.authors(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS authors_slug_idx ON public.authors(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON public.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_media_library_uploaded_by ON public.media_library(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_slug_history_old_slug ON public.slug_history(old_slug);
CREATE INDEX IF NOT EXISTS idx_slug_history_article_id ON public.slug_history(article_id);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_articles_status_published_at ON public.articles(status, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_author_status ON public.articles(author_id, status);

COMMENT ON COLUMN public.authors.social_links IS 'JSON object with social media links: {twitter, linkedin, website}';

-- =====================================================
-- STEP 5: CREATE TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_authors_updated_at ON public.authors;
CREATE TRIGGER update_authors_updated_at BEFORE UPDATE ON public.authors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_articles_updated_at ON public.articles;
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'author')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle slug changes (301 redirects)
CREATE OR REPLACE FUNCTION public.handle_slug_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.slug IS DISTINCT FROM NEW.slug THEN
    INSERT INTO public.slug_history (article_id, old_slug, new_slug)
    VALUES (NEW.id, OLD.slug, NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for slug changes
DROP TRIGGER IF EXISTS on_article_slug_change ON public.articles;
CREATE TRIGGER on_article_slug_change
  AFTER UPDATE ON public.articles
  FOR EACH ROW
  WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION public.handle_slug_change();

-- =====================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
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
-- STEP 7: CREATE RLS POLICIES
-- =====================================================

-- =================
-- USERS POLICIES
-- =================

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- =================
-- AUTHORS POLICIES
-- =================

CREATE POLICY "authors_select_all" ON public.authors
  FOR SELECT USING (true);

CREATE POLICY "authors_insert_own" ON public.authors
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "authors_update_own" ON public.authors
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "authors_delete_admin" ON public.authors
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- =================
-- CATEGORIES POLICIES
-- =================

CREATE POLICY "categories_select_all" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_insert_admin" ON public.categories
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

CREATE POLICY "categories_update_admin" ON public.categories
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

CREATE POLICY "categories_delete_admin" ON public.categories
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- =================
-- TAGS POLICIES
-- =================

CREATE POLICY "tags_select_all" ON public.tags
  FOR SELECT USING (true);

CREATE POLICY "tags_insert_authenticated" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tags_update_admin" ON public.tags
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

CREATE POLICY "tags_delete_admin" ON public.tags
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- =================
-- ARTICLES POLICIES (CRITICAL - PREVENTS DRAFT LEAKAGE)
-- =================

-- SELECT: Only published for public, own articles for authors, all for admins
CREATE POLICY "articles_select_policy" ON public.articles
  FOR SELECT USING (
    status = 'published' 
    OR auth.uid() IN (
      SELECT user_id FROM public.authors WHERE id = author_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- INSERT: Authors can create (will default to draft status)
CREATE POLICY "articles_insert_authors" ON public.articles
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.authors WHERE id = author_id
    )
  );

-- UPDATE: Authors own articles + admins all
CREATE POLICY "articles_update_policy" ON public.articles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM public.authors WHERE id = author_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- DELETE: Authors own articles + admins all
CREATE POLICY "articles_delete_policy" ON public.articles
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM public.authors WHERE id = author_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- =================
-- ARTICLE_TAGS POLICIES
-- =================

CREATE POLICY "article_tags_select_all" ON public.article_tags
  FOR SELECT USING (true);

CREATE POLICY "article_tags_manage_authors" ON public.article_tags
  FOR ALL USING (
    auth.uid() IN (
      SELECT au.user_id 
      FROM public.articles a
      JOIN public.authors au ON a.author_id = au.id
      WHERE a.id = article_id
    )
    OR auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- =================
-- MEDIA_LIBRARY POLICIES
-- =================

CREATE POLICY "media_select_all" ON public.media_library
  FOR SELECT USING (true);

CREATE POLICY "media_insert_authenticated" ON public.media_library
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "media_delete_own_or_admin" ON public.media_library
  FOR DELETE USING (
    auth.uid() = uploaded_by
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- =================
-- SLUG_HISTORY POLICIES
-- =================

CREATE POLICY "slug_history_select_all" ON public.slug_history
  FOR SELECT USING (true);

CREATE POLICY "slug_history_insert_system" ON public.slug_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- STEP 8: STORAGE BUCKET SETUP
-- =====================================================

-- Create media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
DROP POLICY IF EXISTS "media_select_public" ON storage.objects;
CREATE POLICY "media_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_insert_authenticated" ON storage.objects;
CREATE POLICY "media_insert_authenticated" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' 
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "media_update_own" ON storage.objects;
CREATE POLICY "media_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' 
    AND auth.uid() = owner
  );

DROP POLICY IF EXISTS "media_delete_own_or_admin" ON storage.objects;
CREATE POLICY "media_delete_own_or_admin" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' 
    AND (
      auth.uid() = owner
      OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
    )
  );

-- =====================================================
-- STEP 9: VERIFICATION QUERIES
-- =====================================================

-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verify policies exist
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Verify indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Next steps:
-- 1. Create your first user via signup page
-- 2. Update user role to 'admin' if needed:
--    UPDATE public.users SET role = 'admin' WHERE email = 'your-email@example.com';
-- 3. Run seed data script to populate sample content
