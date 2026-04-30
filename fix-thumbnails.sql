-- Fix thumbnail columns and add placeholders for all drafts and posts

-- 1. Add thumbnail_alt column to blog_posts if it doesn't exist
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS thumbnail_alt TEXT;

-- 2. Set default thumbnail placeholder for empty thumbnails in draft_posts
UPDATE draft_posts 
SET thumbnail_url = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop',
    thumbnail_alt = 'Health and wellness blog post thumbnail'
WHERE thumbnail_url IS NULL 
   OR thumbnail_url = '' 
   OR thumbnail_url = 'undefined';

-- 3. Set default thumbnail placeholder for empty thumbnails in blog_posts
UPDATE blog_posts 
SET thumbnail_url = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop',
    thumbnail_alt = 'Health and wellness blog post thumbnail'
WHERE thumbnail_url IS NULL 
   OR thumbnail_url = '' 
   OR thumbnail_url = 'undefined';

-- 4. Set default values for future inserts
ALTER TABLE draft_posts 
ALTER COLUMN thumbnail_url SET DEFAULT 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop';

ALTER TABLE draft_posts 
ALTER COLUMN thumbnail_alt SET DEFAULT 'Health and wellness blog post thumbnail';

ALTER TABLE blog_posts 
ALTER COLUMN thumbnail_url SET DEFAULT 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop';

ALTER TABLE blog_posts 
ALTER COLUMN thumbnail_alt SET DEFAULT 'Health and wellness blog post thumbnail';

-- Verify the updates
SELECT 'Draft posts updated' as table_name, COUNT(*) as count 
FROM draft_posts 
WHERE thumbnail_url IS NOT NULL AND thumbnail_url != '';

SELECT 'Blog posts updated' as table_name, COUNT(*) as count 
FROM blog_posts 
WHERE thumbnail_url IS NOT NULL AND thumbnail_url != '';
