ALTER TABLE public.web_stories
  ADD COLUMN IF NOT EXISTS status article_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS structured_data JSONB,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cover_image_alt TEXT;

CREATE INDEX IF NOT EXISTS idx_web_stories_status
ON public.web_stories(status);

CREATE INDEX IF NOT EXISTS idx_web_stories_published_at
ON public.web_stories(published_at DESC);

DROP POLICY IF EXISTS "Anyone can view web stories" ON public.web_stories;
CREATE POLICY "Anyone can view web stories" ON public.web_stories
  FOR SELECT USING (
    status = 'published'
    OR auth.uid() IN (
      SELECT user_id FROM public.authors WHERE id = author_id
    )
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );
