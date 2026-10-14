-- Festive Health-Hamper package bookings, made from the home page section and
-- the festive offer popup. A booking is often a gift: the buyer pays and is
-- who FXMed confirms with, and the recipient is who FXMed visits. For a
-- booking for oneself the recipient columns repeat the buyer's details.
--
-- Payment is taken on a Paystack payment page outside the site, so staff set
-- payment_status once they see the payment in Paystack.
BEGIN;

CREATE TABLE IF NOT EXISTS public.festive_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id text NOT NULL,
  package_name text NOT NULL,
  package_price integer NOT NULL CHECK (package_price > 0),
  booked_for text NOT NULL CHECK (booked_for IN ('self','gift')),
  buyer_first_name text NOT NULL,
  buyer_last_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text NOT NULL,
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  visit_address text NOT NULL,
  -- Both empty when the buyer leaves FXMed to arrange the visit directly.
  preferred_date date,
  preferred_time text,
  gift_message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS festive_bookings_created_idx
  ON public.festive_bookings(created_at DESC);

-- Read and written only through the server routes, as in 018.
ALTER TABLE public.festive_bookings ENABLE ROW LEVEL SECURITY;

-- Everyone a booking names belongs in Contacts (see 032): the buyer, and the
-- recipient when it is a gift. One contact per person per booking, never
-- rewritten afterwards.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS festive_booking_id uuid
    REFERENCES public.festive_bookings(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contacts_festive_booking_idx
  ON public.contacts(festive_booking_id, phone);

CREATE OR REPLACE FUNCTION public.mirror_festive_booking_to_contacts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.contacts (
    festive_booking_id, full_name, phone, email, address, health_concern,
    outreach_event, status, created_at
  )
  VALUES (
    NEW.id, concat_ws(' ', NEW.buyer_first_name, NEW.buyer_last_name),
    NEW.buyer_phone, NEW.buyer_email,
    CASE WHEN NEW.booked_for = 'self' THEN NEW.visit_address END,
    CASE WHEN NEW.booked_for = 'gift'
      THEN format('%s package, bought as a gift for %s', NEW.package_name, NEW.recipient_name)
      ELSE format('%s package', NEW.package_name)
    END,
    'Festive package booking', 'new', NEW.created_at
  )
  ON CONFLICT (festive_booking_id, phone) DO NOTHING;

  IF NEW.booked_for = 'gift' THEN
    INSERT INTO public.contacts (
      festive_booking_id, full_name, phone, address, health_concern,
      outreach_event, status, created_at
    )
    VALUES (
      NEW.id, NEW.recipient_name, NEW.recipient_phone, NEW.visit_address,
      format('%s package, gift from %s', NEW.package_name, concat_ws(' ', NEW.buyer_first_name, NEW.buyer_last_name)),
      'Festive package gift recipient', 'new', NEW.created_at
    )
    ON CONFLICT (festive_booking_id, phone) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mirror_festive_booking_to_contacts()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS festive_booking_contact_insert ON public.festive_bookings;
CREATE TRIGGER festive_booking_contact_insert
  AFTER INSERT ON public.festive_bookings
  FOR EACH ROW EXECUTE FUNCTION public.mirror_festive_booking_to_contacts();

COMMIT;
