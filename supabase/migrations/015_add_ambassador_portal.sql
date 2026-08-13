-- Separate ambassador portal data model. Ambassador accounts are regular
-- Supabase Auth users tagged with app_metadata.account_type = 'ambassador';
-- they are intentionally not admin dashboard roles.

CREATE TABLE IF NOT EXISTS public.ambassador_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL UNIQUE REFERENCES public.ambassador_applications(id) ON DELETE RESTRICT,
  ambassador_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'inactive')),
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 40),
  organization TEXT CHECK (organization IS NULL OR char_length(organization) <= 160),
  job_title TEXT CHECK (job_title IS NULL OR char_length(job_title) <= 120),
  bank_name TEXT CHECK (bank_name IS NULL OR char_length(bank_name) <= 120),
  bank_account_name TEXT CHECK (bank_account_name IS NULL OR char_length(bank_account_name) <= 160),
  bank_account_number TEXT CHECK (bank_account_number IS NULL OR char_length(bank_account_number) <= 30),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ambassador_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id UUID NOT NULL REFERENCES public.ambassador_profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  last_name TEXT NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 80),
  email TEXT NOT NULL CHECK (char_length(email) <= 254),
  phone TEXT NOT NULL CHECK (char_length(phone) <= 40),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1600),
  consent_confirmed BOOLEAN NOT NULL CHECK (consent_confirmed = TRUE),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'contacted', 'consultation_booked', 'converted', 'declined')),
  membership_tier TEXT
    CHECK (membership_tier IS NULL OR membership_tier IN ('essential', 'premium', 'elite')),
  membership_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (membership_amount >= 0),
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (commission_rate BETWEEN 0 AND 100),
  commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  commission_status TEXT NOT NULL DEFAULT 'not_earned'
    CHECK (commission_status IN ('not_earned', 'pending', 'approved', 'paid')),
  admin_feedback TEXT CHECK (admin_feedback IS NULL OR char_length(admin_feedback) <= 1600),
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ambassador_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id UUID NOT NULL REFERENCES public.ambassador_profiles(id) ON DELETE CASCADE,
  referral_id UUID UNIQUE REFERENCES public.ambassador_referrals(id) ON DELETE SET NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'processing', 'paid', 'failed')),
  payment_reference TEXT CHECK (payment_reference IS NULL OR char_length(payment_reference) <= 160),
  proof_url TEXT CHECK (proof_url IS NULL OR char_length(proof_url) <= 1000),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ambassador_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ambassador_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  resource_url TEXT NOT NULL CHECK (char_length(resource_url) <= 1000),
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ambassador_profiles_status_idx ON public.ambassador_profiles(status);
CREATE INDEX IF NOT EXISTS ambassador_referrals_ambassador_created_idx ON public.ambassador_referrals(ambassador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ambassador_referrals_status_idx ON public.ambassador_referrals(status);
CREATE INDEX IF NOT EXISTS ambassador_payouts_ambassador_created_idx ON public.ambassador_payouts(ambassador_id, created_at DESC);

ALTER TABLE public.ambassador_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_resources ENABLE ROW LEVEL SECURITY;

-- Portal reads are limited to the authenticated ambassador's records. Writes
-- go through validated server routes; admin operations use the service role.
CREATE POLICY "Ambassadors can read their own profile"
  ON public.ambassador_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Ambassadors can read their own referrals"
  ON public.ambassador_referrals FOR SELECT TO authenticated
  USING (ambassador_id IN (SELECT id FROM public.ambassador_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Ambassadors can read their own payouts"
  ON public.ambassador_payouts FOR SELECT TO authenticated
  USING (ambassador_id IN (SELECT id FROM public.ambassador_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Ambassadors can read published announcements"
  ON public.ambassador_announcements FOR SELECT TO authenticated
  USING (published = TRUE);

CREATE POLICY "Ambassadors can read published resources"
  ON public.ambassador_resources FOR SELECT TO authenticated
  USING (published = TRUE);

CREATE OR REPLACE FUNCTION update_ambassador_portal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ambassador_profiles', 'ambassador_referrals', 'ambassador_payouts',
    'ambassador_announcements', 'ambassador_resources'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_ambassador_portal_updated_at()',
      table_name, table_name
    );
  END LOOP;
END $$;
