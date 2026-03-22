-- Lock down write access to engagement counters.
DROP POLICY IF EXISTS "Anyone can update engagement counters" ON public.article_engagement;
DROP POLICY IF EXISTS "Anyone can modify engagement counters" ON public.article_engagement;

DROP POLICY IF EXISTS "Anyone can insert web story engagement" ON public.web_story_engagement;
DROP POLICY IF EXISTS "Anyone can update web story engagement" ON public.web_story_engagement;

-- Only admins should be able to create taxonomy directly.
DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
CREATE POLICY "Admins can create tags" ON public.tags
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );
