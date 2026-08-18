-- Seed: Patient Engagement Specialist opening.
-- Run AFTER 019_add_careers.sql. This is data, not schema, so it is kept out of
-- the migrations folder. The same record can be created or edited from the
-- Careers tab in the admin dashboard.
--
-- Safe to run more than once: INSERT ... SELECT ... WHERE NOT EXISTS skips the
-- insert when an opening with this title is already present.

INSERT INTO public.career_openings (
  title, department, location, employment_type, summary,
  responsibilities, requirements, status, sort_order
)
SELECT
  'Patient Engagement Specialist',
  'Clinical',
  'Lagos, Nigeria · Hybrid',
  'Full-time',
  'A hybrid nursing role combining digital patient engagement with hands-on patient care and health education. You will support patients throughout their healthcare journey, run education sessions, take part in home visits, and use digital health tools to improve the patient experience and outcomes.',
  ARRAY[
    'Engage with patients and support them throughout their healthcare journey',
    'Follow up with patients and support adherence to their care plans and health goals',
    'Conduct health talks and patient education sessions',
    'Develop and contribute to healthcare content for patients and the wider public',
    'Participate in home visits as part of patient care and support',
    'Help patients navigate their healthcare needs and connect them with appropriate care',
    'Monitor patient engagement and identify areas where additional support may be needed',
    'Work closely with clinicians and the wider FXMed team',
    'Use digital health tools and data to improve the patient experience and outcomes'
  ],
  ARRAY[
    'A qualified nurse with current registration',
    'Experience using digital health tools and platforms',
    'Confident leading health talks and patient education sessions',
    'Comfortable taking part in home visits as part of patient care',
    'Interest in building a career at the intersection of nursing, digital health and technology'
  ],
  'published',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.career_openings WHERE title = 'Patient Engagement Specialist'
);
