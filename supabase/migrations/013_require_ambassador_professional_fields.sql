-- Organization and job title are required for all new ambassador applications.
-- NOT VALID preserves any existing applications submitted before these fields became required.

ALTER TABLE public.ambassador_applications
  ADD CONSTRAINT ambassador_applications_organization_required
    CHECK (organization IS NOT NULL AND char_length(btrim(organization)) > 0) NOT VALID,
  ADD CONSTRAINT ambassador_applications_job_title_required
    CHECK (job_title IS NOT NULL AND char_length(btrim(job_title)) > 0) NOT VALID;
