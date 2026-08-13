-- Security hardening for data that is intentionally accessed only through
-- authenticated Next.js server routes using the Supabase service role.

DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'draft_posts',
    'crm_patients',
    'financial_revenue_streams',
    'financial_expenses',
    'financial_tasks',
    'financial_deals',
    'appointments',
    'messages',
    'contacts',
    'chat_sessions',
    'chat_messages',
    'investigation_forms',
    'investigation_results'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      FOR policy_name IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = table_name
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Remove legacy draft/browser management policies. Drafts are now managed
-- exclusively by the authorized server API.
DROP POLICY IF EXISTS "Admins can manage draft posts" ON public.draft_posts;
DO $$
BEGIN
  IF to_regprocedure('public.publish_draft(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.publish_draft(uuid) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- Blog articles remain publicly readable only after publication. The previous
-- permissive policy allowed anonymous inserts, updates, and deletes.
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Users can view published posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
CREATE POLICY "Public can view published blog posts"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- A public bucket is required for article thumbnails, but browser uploads must
-- not be authorized. Uploads are made by the protected server endpoint.
DROP POLICY IF EXISTS "Public can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;

-- Also remove differently named write policies that were scoped specifically
-- to this bucket. Public object reads continue to be controlled by the bucket's
-- public setting.
DO $$
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd <> 'SELECT'
      AND (coalesce(qual, '') ILIKE '%blog-images%' OR coalesce(with_check, '') ILIKE '%blog-images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
  END LOOP;
END $$;
