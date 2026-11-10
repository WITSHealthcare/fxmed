-- First-party analytics for the public website, shown on the admin SEO
-- Analytics tab. One row per page view, recorded by /api/analytics/collect.
--
-- No cookies and nothing that identifies a person: a visitor is a hash of
-- their IP address and browser that changes every day, so visitors are
-- counted exactly per day but cannot be followed from one day to the next. A
-- visit (session) is a random id kept in the browser tab. Location comes from
-- the country, region and city Vercel derives from the IP address; the IP
-- itself is never stored. Staff and patient areas are never recorded.
BEGIN;

CREATE TABLE IF NOT EXISTS public.site_page_views (
  -- Chosen by the browser, so the time-on-page update can find its view.
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  visitor_hash text NOT NULL,
  session_id text NOT NULL,
  -- The first page of a visit: where it landed and where it came from.
  is_entry boolean NOT NULL DEFAULT false,
  path text NOT NULL,
  referrer_host text,
  source text NOT NULL DEFAULT 'Direct',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,
  region text,
  city text,
  device text,
  browser text,
  os text,
  -- Time the page was visible, capped at 30 minutes.
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 0 AND 1800)
);

CREATE INDEX IF NOT EXISTS site_page_views_created_idx ON public.site_page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS site_page_views_session_idx ON public.site_page_views (session_id, created_at);

-- Written and read only by the server with the service role.
ALTER TABLE public.site_page_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_page_views FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.site_page_views TO service_role;

-- Everything the SEO Analytics tab shows for a period, as one JSON document.
-- Days and hours are Lagos time. Breakdowns count visits, attributed to the
-- visit's first page; "visitors" in a breakdown is the sum of each day's
-- unique visitors, since a visitor is only recognisable within one day.
CREATE OR REPLACE FUNCTION public.site_analytics(p_from timestamptz, p_to timestamptz, p_limit integer DEFAULT 12)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH views AS (
    SELECT *, (created_at AT TIME ZONE 'Africa/Lagos')::date AS day
    FROM site_page_views
    WHERE created_at >= p_from AND created_at < p_to
  ),
  visits AS (
    SELECT session_id, count(*) AS page_views, coalesce(sum(duration_seconds), 0) AS seconds
    FROM views GROUP BY session_id
  ),
  entries AS (
    SELECT DISTINCT ON (session_id) session_id, day, visitor_hash, path, source, referrer_host,
      utm_source, utm_medium, utm_campaign, country, region, city, device, browser, os, created_at
    FROM views ORDER BY session_id, created_at
  ),
  entry_visits AS (
    SELECT e.*, v.page_views, v.seconds FROM entries e JOIN visits v USING (session_id)
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'page_views', (SELECT count(*) FROM views),
      'visits', (SELECT count(*) FROM visits),
      'visitor_days', (SELECT count(DISTINCT (day, visitor_hash)) FROM views),
      'bounces', (SELECT count(*) FROM visits WHERE page_views = 1),
      'avg_visit_seconds', (SELECT coalesce(round(avg(seconds)), 0) FROM visits),
      'search_visits', (SELECT count(*) FROM entries WHERE source IN ('Google', 'Bing', 'Yahoo', 'DuckDuckGo', 'Yandex', 'Ecosia', 'Baidu'))
    ),
    'daily', (SELECT coalesce(jsonb_agg(d ORDER BY d.day), '[]'::jsonb) FROM (
      SELECT day, count(DISTINCT visitor_hash) AS visitors, count(DISTINCT session_id) AS visits, count(*) AS page_views
      FROM views GROUP BY day
    ) d),
    'hours', (SELECT coalesce(jsonb_agg(h ORDER BY h.hour), '[]'::jsonb) FROM (
      SELECT extract(hour FROM created_at AT TIME ZONE 'Africa/Lagos')::int AS hour, count(*) AS visits
      FROM entries GROUP BY 1
    ) h),
    'pages', (SELECT coalesce(jsonb_agg(p), '[]'::jsonb) FROM (
      SELECT path AS name, count(*) AS page_views, count(DISTINCT (day, visitor_hash)) AS visitors
      FROM views GROUP BY path ORDER BY count(*) DESC, path LIMIT p_limit
    ) p),
    'landing_pages', (SELECT coalesce(jsonb_agg(p), '[]'::jsonb) FROM (
      SELECT path AS name, count(*) AS visits, count(*) FILTER (WHERE page_views = 1) AS bounces
      FROM entry_visits GROUP BY path ORDER BY count(*) DESC, path LIMIT p_limit
    ) p),
    'sources', (SELECT coalesce(jsonb_agg(s), '[]'::jsonb) FROM (
      SELECT source AS name, count(*) AS visits, count(DISTINCT (day, visitor_hash)) AS visitors
      FROM entries GROUP BY source ORDER BY count(*) DESC, source LIMIT p_limit
    ) s),
    'referrers', (SELECT coalesce(jsonb_agg(r), '[]'::jsonb) FROM (
      SELECT referrer_host AS name, count(*) AS visits
      FROM entries WHERE referrer_host IS NOT NULL GROUP BY referrer_host ORDER BY count(*) DESC, referrer_host LIMIT p_limit
    ) r),
    'campaigns', (SELECT coalesce(jsonb_agg(c), '[]'::jsonb) FROM (
      SELECT concat_ws(' / ', coalesce(utm_campaign, '(no campaign)'), utm_source, utm_medium) AS name, count(*) AS visits
      FROM entries WHERE utm_source IS NOT NULL OR utm_campaign IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT p_limit
    ) c),
    'countries', (SELECT coalesce(jsonb_agg(c), '[]'::jsonb) FROM (
      SELECT coalesce(country, 'Unknown') AS name, count(*) AS visits, count(DISTINCT (day, visitor_hash)) AS visitors
      FROM entries GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT p_limit
    ) c),
    'cities', (SELECT coalesce(jsonb_agg(c), '[]'::jsonb) FROM (
      SELECT city AS name, region, country, count(*) AS visits
      FROM entries WHERE city IS NOT NULL GROUP BY city, region, country ORDER BY count(*) DESC, city LIMIT p_limit
    ) c),
    'devices', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT coalesce(device, 'Unknown') AS name, count(*) AS visits FROM entries GROUP BY 1 ORDER BY count(*) DESC, 1
    ) x),
    'browsers', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT coalesce(browser, 'Unknown') AS name, count(*) AS visits FROM entries GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT p_limit
    ) x),
    'operating_systems', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT coalesce(os, 'Unknown') AS name, count(*) AS visits FROM entries GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT p_limit
    ) x)
  )
$$;

REVOKE EXECUTE ON FUNCTION public.site_analytics(timestamptz, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.site_analytics(timestamptz, timestamptz, integer) TO service_role;

COMMIT;
