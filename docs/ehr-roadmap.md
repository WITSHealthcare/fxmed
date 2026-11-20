# Making FXMed the best EHR in Nigeria

How the clinical system compares with what Nigerian clinics, HMOs and patients need, and what to build, in order.

## What FXMed already does well

These are ahead of most Nigerian EHRs:

- **Insurance cover.** NHIA, BHCPF, state-scheme and HMO cover, with daily verification and records that can't be changed afterwards.
- **Referrals.** HMO authorisation codes and counter-referral feedback.
- **AI help.** Reading uploaded lab reports, turning a consultation transcript into encounter notes, answering questions about a patient's record, and functional-medicine lab analysis against optimal ranges.
- **Patient portal.** Shared care plans, uploads, messages and invoices.
- **Prices in Naira.** Lab and booking prices, and invoice PDFs.
- **Outreach.** Taking vitals at events and turning attendees into patients.
- **Access.** The database is locked down behind server-side role checks, and chart views and document downloads are audit-logged.

## Where it falls short

Ordered by impact for a Nigerian clinic.

### 1. Clinical safety and legal integrity (fix first)

| Gap | Why it matters | Build |
|---|---|---|
| No allergy, interaction or duplicate checks when prescribing | Patient safety; malpractice exposure | Check the active allergies and medications against the drug catalog when a prescription is saved; show a blocking warning that needs a reason to override |
| Printed prescriptions have no prescriber name or MDCN number | Pharmacies may reject them; MDCN rules | Add prescriber name, MDCN number and signature image to staff profiles and every printout |
| Finalised notes can be edited again (the lock was removed in migration 021) | Medico-legal records must not change after signing | Bring back the lock; changes only through signed amendments, which already exist |
| Clinical audit log can be edited | NDPA and medico-legal | Make `emr_audit_logs` append-only, as `admin_activity_logs` already is |
| Diagnoses can't be added from the chart | Lost coded data | Wire up the existing "Record diagnosis" form |
| Admin and clinical roles are identical; no two-step sign-in | Least-privilege access; NDPA | Separate doctor, nurse, lab and front-desk roles; two-step sign-in for anyone who can open charts |

### 2. Getting paid (HMOs and Paystack)

| Gap | Build |
|---|---|
| Invoices are reconciled by hand | Paystack checkout on EMR invoices and bookings (`lib/paystack.ts` already exists for courses), with webhook auto-reconciliation and a "Pay now" button in the patient portal |
| No HMO claims | HMO tariff tables, a claim generated from each encounter (diagnoses + services + ICD-10), pre-authorisation requests, claim status tracking and an NHIA claim form PDF |
| No revenue view | Clinic dashboard: revenue by payer, outstanding claims, days to payment |

### 3. Reaching patients where they are (WhatsApp first)

| Gap | Build |
|---|---|
| Email is the only automatic channel | WhatsApp Business API (or Termii for SMS and WhatsApp) for appointment reminders 24 h and 2 h before, results-ready alerts, follow-up nudges and invoice links |
| Follow-ups are click-to-chat links | Send automatically from the follow-up list and log replies in the existing contact log |
| No video for telemedicine bookings | Built-in video room (Daily or Jitsi) linked from the appointment and the patient portal |

### 4. Nigerian patient record basics

- NIN (with NIMC verification later), state and LGA dropdowns, next of kin separate from the emergency contact, preferred language (English, Yoruba, Igbo, Hausa, Pidgin), and a photo.
- Duplicate-patient detection by fuzzy name, DOB and phone, with a merge tool.
- Patient queue and triage board for walk-ins and home visits: arrived → vitals → with doctor → done.

### 5. Labs as real data

- Retire the second, unused lab model. Store each result value as coded data, using LOINC codes where available.
- Trend charts for any measurement (HbA1c, BP, weight, vitamin D) on the chart overview.
- Critical-value alerts to the ordering clinician.
- Lab-partner integration: e-orders and results to and from Synlab, Clina-Lancet or Afriglobal, starting with emailed PDFs read by the existing AI extraction and moving to APIs.

### 6. Compliance with the Nigeria Data Protection Act (NDPA 2023)

- Separate, versioned consents for treatment, data sharing with HMOs and labs, AI processing (patient data currently goes to US AI providers with no consent check) and marketing, with a way to withdraw.
- Patient data requests: export the full record as PDF + JSON, corrections and erasure, tracked with deadlines. HR already has a data-request workflow to reuse.
- A "Who viewed my record" page in the patient portal, built from the audit log.
- Retention policy and an emergency-access ("break the glass") flow.

### 7. Built for Nigerian power and internet

- Installable app (PWA) with an offline-capable chart for patients seen today, and a queue for notes and vitals entered while offline that syncs when back online.
- Lighter chart loading: the chart currently fires about 20 queries at once. Load the summary first and each section when it's opened.

### 8. A better patient portal

- Medications, allergies, results (with trends) and vitals, written in plain language.
- Book and reschedule appointments, pay online, download the full record.
- Refill requests and secure messages straight from a prescription.

### 9. Reporting

- Clinic analytics: visits, diagnoses, no-shows, turnaround times, revenue.
- NHMIS/DHIS2 monthly returns and notifiable-disease alerts (Lassa fever, cholera, etc.).

## Suggested order

1. **Safety sprint:** prescribing checks, prescriber identity, note lock, append-only audit log, diagnosis entry, finer roles and two-step sign-in.
2. **Revenue sprint:** Paystack on invoices and bookings, and portal "Pay now".
3. **Reach sprint:** WhatsApp/SMS reminders and video visits.
4. **Records sprint:** NIN/LGA/next-of-kin fields, duplicate merge and triage queue.
5. **Data sprint:** coded lab results, trend charts and critical-value alerts.
6. **NDPA sprint:** consents, data requests and the "who viewed" page.
7. **Offline sprint:** installable app and offline queue.
8. **HMO claims** and statutory reporting.
