-- Create draft_posts table (separate from blog_posts)
-- This table will store draft posts that only appear in admin until published

CREATE TABLE IF NOT EXISTS draft_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT DEFAULT '',
  author TEXT DEFAULT 'FXMed Team',
  category TEXT DEFAULT 'Health Education',
  thumbnail_url TEXT DEFAULT '',
  thumbnail_alt TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft')),
  read_time TEXT DEFAULT '5 min read',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_draft_posts_created_at ON draft_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_draft_posts_category ON draft_posts(category);
CREATE INDEX IF NOT EXISTS idx_draft_posts_status ON draft_posts(status);

-- Enable RLS (Row Level Security)
ALTER TABLE draft_posts ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access (you may need to adjust based on your auth setup)
CREATE POLICY "Admins can manage draft posts" ON draft_posts
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_draft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER draft_posts_updated_at
  BEFORE UPDATE ON draft_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_draft_updated_at();

-- Function to publish draft to blog_posts
CREATE OR REPLACE FUNCTION publish_draft(draft_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  published_post_id UUID
) AS $$
DECLARE
  draft_record draft_posts%ROWTYPE;
  published_id UUID;
BEGIN
  -- Get the draft record
  SELECT * INTO draft_record FROM draft_posts WHERE id = draft_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Draft not found', NULL::UUID;
    RETURN;
  END IF;
  
  -- Insert into blog_posts table
  INSERT INTO blog_posts (
    title, slug, excerpt, content, author, category, 
    thumbnail_url, thumbnail_alt, status, read_time
  ) VALUES (
    draft_record.title, draft_record.slug, draft_record.excerpt, draft_record.content,
    draft_record.author, draft_record.category, draft_record.thumbnail_url,
    draft_record.thumbnail_alt, 'published', draft_record.read_time
  )
  RETURNING id INTO published_id;
  
  -- Delete from drafts after successful publish
  DELETE FROM draft_posts WHERE id = draft_id;
  
  RETURN QUERY SELECT true, 'Draft published successfully', published_id;
END;
$$ LANGUAGE plpgsql;
