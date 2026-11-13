-- Keep the original contact while tracking sales follow-ups separately.
alter table public.crm_prospects
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;
create unique index if not exists crm_prospects_contact_id_idx
  on public.crm_prospects(contact_id) where contact_id is not null;
