-- Store Financial CRM sales pipeline opportunities

CREATE TABLE IF NOT EXISTS financial_deals (
  id text PRIMARY KEY,
  company text NOT NULL,
  type text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'cold',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO financial_deals (id, company, type, value, status, notes)
VALUES
  ('d1', 'GTBank', 'Corporate', 2500000, 'warm', 'CHRO meeting scheduled'),
  ('d2', 'LASPEC', 'Government', 6000000, 'cold', 'Awaiting intro'),
  ('d3', 'The Haven', 'Elderly Care', 450000, 'warm', 'Site visit planned'),
  ('d4', 'Hygeia HMO', 'HMO', 1500000, 'hot', 'Proposal sent')
ON CONFLICT (id) DO NOTHING;
