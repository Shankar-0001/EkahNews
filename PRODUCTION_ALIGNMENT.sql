-- Production alignment migration for NewsHarpal / EkahNews
-- Run this after the base setup script to bring the database in line with the current application code.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'article_status'
      AND e.enumlabel = 'archived'
  ) THEN
    NULL;
  ELSE
    ALTER TYPE public.article_status ADD VALUE 'archived';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.articles
  ADD COLUMN IF NOT EXISTS featured_image_alt text,
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS schema_type text NOT NULL DEFAULT 'NewsArticle',
  ADD COLUMN IF NOT EXISTS structured_data jsonb;

ALTER TABLE IF EXISTS public.articles
  DROP CONSTRAINT IF EXISTS articles_schema_type_check;

ALTER TABLE IF EXISTS public.articles
  ADD CONSTRAINT articles_schema_type_check
  CHECK (schema_type IN ('NewsArticle', 'BlogPosting'));

CREATE TABLE IF NOT EXISTS public.trending_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  slug text NOT NULL UNIQUE,
  search_volume integer NOT NULL DEFAULT 0,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.article_engagement (
  article_id uuid PRIMARY KEY,
  views integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.static_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content_html text,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.web_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  cover_image text NOT NULL,
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  author_id uuid,
  category_id uuid,
  tags text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  related_article_slug text,
  cta_text text,
  cta_url text,
  whatsapp_group_url text,
  ad_slot text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'article_engagement'
      AND constraint_name = 'article_engagement_article_id_fkey'
  ) THEN
    ALTER TABLE public.article_engagement
      ADD CONSTRAINT article_engagement_article_id_fkey
      FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'web_stories'
      AND constraint_name = 'web_stories_author_id_fkey'
  ) THEN
    ALTER TABLE public.web_stories
      ADD CONSTRAINT web_stories_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'web_stories'
      AND constraint_name = 'web_stories_category_id_fkey'
  ) THEN
    ALTER TABLE public.web_stories
      ADD CONSTRAINT web_stories_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'articles'
      AND constraint_name = 'articles_author_id_fkey'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public.authors(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'articles'
      AND constraint_name = 'articles_category_id_fkey'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'article_tags'
      AND column_name = 'article_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'article_tags'
      AND constraint_name = 'article_tags_article_id_fkey'
  ) THEN
    ALTER TABLE public.article_tags
      ADD CONSTRAINT article_tags_article_id_fkey
      FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'article_tags'
      AND column_name = 'tag_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'article_tags'
      AND constraint_name = 'article_tags_tag_id_fkey'
  ) THEN
    ALTER TABLE public.article_tags
      ADD CONSTRAINT article_tags_tag_id_fkey
      FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status_published_at ON public.articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category_id_published_at ON public.articles(category_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_authors_slug ON public.authors(slug);
CREATE INDEX IF NOT EXISTS idx_trending_topics_slug ON public.trending_topics(slug);
CREATE INDEX IF NOT EXISTS idx_trending_topics_updated_at ON public.trending_topics(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_stories_slug ON public.web_stories(slug);
CREATE INDEX IF NOT EXISTS idx_web_stories_created_at ON public.web_stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_static_pages_slug ON public.static_pages(slug);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_articles_set_updated_at ON public.articles;
CREATE TRIGGER trg_articles_set_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_web_stories_set_updated_at ON public.web_stories;
CREATE TRIGGER trg_web_stories_set_updated_at
BEFORE UPDATE ON public.web_stories
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_trending_topics_set_updated_at ON public.trending_topics;
CREATE TRIGGER trg_trending_topics_set_updated_at
BEFORE UPDATE ON public.trending_topics
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_static_pages_set_updated_at ON public.static_pages;
CREATE TRIGGER trg_static_pages_set_updated_at
BEFORE UPDATE ON public.static_pages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;
