-- Sales prospects and their dated interaction / meeting history.
create table if not exists public.crm_prospects (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('individual', 'corporate')),
  name text not null,
  contact_person text not null default '',
  phone text not null default '',
  email text not null default '',
  owner text not null default '',
  status text not null default 'new' check (status in ('new','in_discussion','proposal_sent','won','lost')),
  next_follow_up timestamptz,
  next_action text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.crm_prospect_interactions (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.crm_prospects(id) on delete cascade,
  kind text not null check (kind in ('call','meeting','email','whatsapp','note')),
  occurred_at timestamptz not null,
  notes text not null,
  created_at timestamptz not null default now()
);
create index if not exists crm_prospect_follow_up_idx on public.crm_prospects(next_follow_up);
create index if not exists crm_prospect_interaction_idx on public.crm_prospect_interactions(prospect_id, occurred_at desc);
alter table public.crm_prospects enable row level security;
alter table public.crm_prospect_interactions enable row level security;
-- Access is through the authenticated CRM API using the service role only.
revoke all on public.crm_prospects, public.crm_prospect_interactions from anon, authenticated;
