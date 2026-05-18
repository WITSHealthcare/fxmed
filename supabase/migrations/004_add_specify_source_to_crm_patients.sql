-- Add a free-text source detail field for CRM leads

ALTER TABLE crm_patients
ADD COLUMN IF NOT EXISTS specify_source text;

COMMENT ON COLUMN crm_patients.specify_source IS 'Optional free-text detail for the selected lead source.';
