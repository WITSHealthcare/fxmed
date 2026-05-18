-- Store Financial CRM revenue streams and expenses in Supabase

CREATE TABLE IF NOT EXISTS financial_revenue_streams (
  id text PRIMARY KEY,
  name text NOT NULL,
  target numeric NOT NULL DEFAULT 0,
  secured numeric NOT NULL DEFAULT 0,
  source_type text NOT NULL DEFAULT 'manual',
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_expenses (
  id text PRIMARY KEY,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_tasks (
  id text PRIMARY KEY,
  title text NOT NULL,
  due_date date NOT NULL,
  priority text NOT NULL DEFAULT 'Medium',
  category text NOT NULL DEFAULT 'ops',
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO financial_revenue_streams (id, name, target, secured, source_type)
VALUES
  ('corporate', 'Corporate Wellness Screenings', 27000000, 0, 'default'),
  ('government', 'Government Pilot (LASPEC)', 12000000, 0, 'default'),
  ('elderly', 'Elderly Care Retainers', 9000000, 0, 'default'),
  ('hmo', 'HMO Partnerships', 6000000, 0, 'default'),
  ('premium', 'Premium Founding Members', 9000000, 0, 'default'),
  ('self-referral', 'Self Referral', 10000000, 0, 'default')
ON CONFLICT (id) DO NOTHING;
