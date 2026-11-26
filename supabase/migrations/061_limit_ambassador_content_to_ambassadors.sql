-- Ambassador announcements and resources were readable by any signed-in
-- account through the public API (anon key + the user's session). Patients
-- and learners have sessions too, and anyone can sign up as a learner at
-- /learn, so limit these rows to accounts with an ambassador profile.
--
-- The Ambassador Portal itself reads these through the server API with the
-- service role, which RLS does not apply to, so the portal is unaffected.

DROP POLICY IF EXISTS "Ambassadors can read published announcements" ON public.ambassador_announcements;
CREATE POLICY "Ambassadors can read published announcements"
  ON public.ambassador_announcements FOR SELECT TO authenticated
  USING (published = TRUE AND EXISTS (SELECT 1 FROM public.ambassador_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Ambassadors can read published resources" ON public.ambassador_resources;
CREATE POLICY "Ambassadors can read published resources"
  ON public.ambassador_resources FOR SELECT TO authenticated
  USING (published = TRUE AND EXISTS (SELECT 1 FROM public.ambassador_profiles WHERE user_id = auth.uid()));
