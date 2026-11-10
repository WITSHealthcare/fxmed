# FXMed 12-Month Hiring Plan (January–December 2027)

This plan sets out who FXMed hires over the next four quarters, in what order, why each role is needed, what it is likely to cost, and what has to be true before each requisition opens. It is written for a small, growing Lagos clinic that delivers most of its care in patients' homes and online, so every hire is tied to a service or programme that is already selling or about to launch. Nothing here is a commitment to hire: each role opens only when its trigger is met and the offer is approved under `docs/hr/recruiting-process.md`. Job descriptions are in `docs/hr/job-descriptions.md`. All salary figures are placeholders and must be confirmed before use.

Owner: Head of Talent Acquisition (to assign). Approver: Medical Director and Managing Director (to assign).

---

## 1. Where we are starting from

Fill this in before the plan is approved. The plan below assumes a founding team of a lead physician, a small clinical team and one or two sales staff, with admin and finance work done by the founders.

| Department (careers tag) | Portal role today | Current headcount (to confirm) | Who does the work now |
|---|---|---|---|
| Clinical | `clinical` | _ | Lead physician, nurse(s), outsourced lab partner |
| Operations | `admin` / `clinical` | _ | Founders and clinical staff, part-time |
| Marketing (sales and growth) | `sales` | _ | Sales rep(s), founders, ambassadors |
| Finance | — | _ | Founders with an external accountant |
| Technology | `admin` | _ | Founders and contractors |

The careers module tags openings with five departments (Clinical, Operations, Marketing, Technology, Finance). Sales roles are tagged **Marketing** and get the `sales` portal role.

---

## 2. Headcount plan by quarter

Quarters are calendar quarters of 2027. "Start" is the target first day; requisitions open roughly 8–10 weeks earlier (12–14 weeks for physicians and the pharmacist).

| ID | Role | Department | Type | Portal role | Quarter | Target start | Open requisition by |
|---|---|---|---|---|---|---|---|
| R01 | Home-Visit Registered Nurse | Clinical | Full-time | clinical | Q1 | 1 Feb 2027 | 1 Dec 2026 |
| R02 | Medical Laboratory Scientist (Sample Collection Lead) | Clinical | Full-time | clinical | Q1 | 1 Feb 2027 | 1 Dec 2026 |
| R03 | Clinical Operations Coordinator | Operations | Full-time | clinical (to confirm) | Q1 | 1 Mar 2027 | 4 Jan 2027 |
| R04 | Patient Growth Associate | Marketing | Full-time | sales | Q1 | 1 Mar 2027 | 4 Jan 2027 |
| L01 | Locum Physician pool (2–3 doctors) | Clinical | Locum | clinical | Q1 onwards | From Feb 2027 | 1 Dec 2026 |
| R05 | Clinical Dietitian | Clinical | Full-time | clinical | Q2 | 3 May 2027 | 1 Mar 2027 |
| R06 | Superintendent Pharmacist | Clinical | Part-time | clinical | Q2 | 3 May 2027 | 15 Feb 2027 |
| R07 | HR and Admin Officer | Operations | Full-time | admin (to confirm) | Q2 | 1 Jun 2027 | 1 Apr 2027 |
| R08 | Finance and Accounts Officer | Finance | Full-time | sales (financial CRM view) | Q2 | 1 Jun 2027 | 1 Apr 2027 |
| T01 | Platform Engineer (conditional) | Technology | Contract | admin | Q2 | 1 Jun 2027 | 1 Apr 2027 |
| R09 | Medical Officer (Functional Medicine) | Clinical | Full-time | clinical | Q3 | 2 Aug 2027 | 3 May 2027 |
| R10 | Speech and Language Therapist | Clinical | Contract (sessional) | clinical | Q3 | 2 Aug 2027 | 1 Jun 2027 |
| R11 | Content and Community Marketing Executive | Marketing | Full-time | sales | Q3 | 1 Sep 2027 | 1 Jul 2027 |
| R12 | Registered Nurse-Midwife (Maternal Wellness) | Clinical | Full-time | clinical | Q4 | 1 Nov 2027 | 1 Sep 2027 |
| R13 | Patient Care Associate | Operations | Full-time | sales (to confirm) | Q4 | 1 Nov 2027 | 1 Sep 2027 |

### New hires by department and quarter

Counts exclude the locum pool (L01), which is a panel of sessional doctors, not headcount.

| Department | Q1 | Q2 | Q3 | Q4 | Total new |
|---|---|---|---|---|---|
| Clinical | 2 | 2 | 2 | 1 | 7 |
| Operations | 1 | 1 | 0 | 1 | 3 |
| Marketing (sales and growth) | 1 | 0 | 1 | 0 | 2 |
| Finance | 0 | 1 | 0 | 0 | 1 |
| Technology | 0 | 1 (conditional) | 0 | 0 | 1 |
| **Total** | **4** | **5** | **3** | **2** | **14** |

### Portal access gap

The admin portal has three roles today: `admin`, `clinical`, `sales`. HR (R07) and Finance (R08) do not fit cleanly: giving R07 full `admin` exposes clinical records it does not need, and R08 only needs the financial CRM view. Before Q2, decide whether to add an `hr` role (and possibly `finance`) to `lib/admin-auth.ts`, or to keep these staff on the narrowest existing role. Recorded as an open question.

---

## 3. Why each hire, tied to the service

| ID | Role | Service or programme it supports | Reasoning |
|---|---|---|---|
| R01 | Home-Visit Registered Nurse | Home visits, concierge medicine, Elite, Immune Support, Adrenal Reset | Every programme package includes home visits. Nurse visits (vitals, IV and injection administration where prescribed, follow-up checks) are the volume work; a second nurse removes the single point of failure and lets us cover Lekki–Ajah and Mainland routes on the same day. |
| R02 | Medical Laboratory Scientist | Lab investigations; all programmes start with testing (thyroid panel, hormones, gut, micronutrients) | Sample collection at home and chain of custody to the partner lab are where quality and turnaround fail. A licensed MLS owns collection, labelling, cold chain, rejected-sample follow-up and results intake into the FM analysis tool. |
| R03 | Clinical Operations Coordinator | Appointment calendar, follow-ups, home-visit routing, lab logistics | Clinicians currently schedule their own visits and chase results. One coordinator plans daily routes around Lagos traffic, confirms appointments, and keeps follow-ups on date. Frees roughly a day a week of clinician time. |
| R04 | Patient Growth Associate | Website, health assessment and Zara leads; ambassador programme | Leads from the assessment and Zara need a reply within the service standard and a booked consultation. Hire when one sales rep can no longer keep every lead with a next step and a date. |
| L01 | Locum Physician pool | Specialist and virtual consultations, weekend and evening cover | Covers leave, peaks and evening virtual consults without a second full-time salary before demand is proven. Also our pipeline for R09. |
| R05 | Clinical Dietitian | Nutrition counselling, Gut Repair, Hormone Balance, Thyroid Recovery, Autism Support (feeding), meal plan designer | Nutrition is part of every programme. Today physicians write meal plans; a dietitian makes this a billable service and improves adherence. |
| R06 | Superintendent Pharmacist | Supplement dispensary | A pharmacy or dispensary that stocks and supplies products needs a registered pharmacist in charge and premises registration with PCN (confirm with counsel which licence category applies to our dispensary). Part-time is enough at current volumes. This is a compliance hire: the dispensary should not expand without it. |
| R07 | HR and Admin Officer | All staff; training LMS; careers | By mid-year headcount roughly doubles. Someone has to own contracts, payroll inputs, pension and statutory remittances, leave, licence-renewal tracking and the new-hire training plan. |
| R08 | Finance and Accounts Officer | Programme fees, HMO and corporate wellness billing, dispensary stock | Monthly payroll, PAYE, pension and NHF remittances, supplier payments and reconciliation outgrow the founders and an external accountant. The external accountant stays for audit and tax filing. |
| T01 | Platform Engineer (conditional) | Admin portal, Zara, FM analysis, ambassador portal | Only if the product roadmap is funded. Contract first; convert to employment if the work is continuous for two quarters. |
| R09 | Medical Officer (Functional Medicine) | Specialist and virtual consultations, all programmes | Second full-time doctor once physician time is the bottleneck (see triggers). Recruit from the locum pool where possible: we already know their clinical quality. |
| R10 | Speech and Language Therapist | Autism Support programme | Speech delay and therapy are core content of the Autism Support programme and blog. Sessional contract first, paid per session, until enrolment justifies a salary. |
| R11 | Content and Community Marketing Executive | Blog, SEO, outreach, corporate wellness, ambassadors | Keeps the blog and campaigns publishing on a schedule and runs outreach events, which are our cheapest acquisition channel. |
| R12 | Registered Nurse-Midwife | Maternal Wellness, pregnancy wellness, newborn health assessment | Maternal Wellness includes postpartum and newborn checks at home. A midwife-qualified nurse is needed before we scale it. |
| R13 | Patient Care Associate | Messages, requests, Zara handovers, reminders | Takes first-line patient messages and reminders so sales and clinical staff are not interrupted. Hire when response-time standards slip. |

---

## 4. Hiring priorities

If money or time runs short, hire in this order. Compliance hires come first because the service cannot legally or safely grow without them.

| Priority | Roles | Rule |
|---|---|---|
| 1 — Compliance and safety | R06 Superintendent Pharmacist, R02 Medical Laboratory Scientist | Do not expand the dispensary or home sample collection without them. |
| 2 — Revenue capacity | R01 Nurse, L01 Locums, R09 Medical Officer, R05 Dietitian | Hire when the trigger is met; these directly add billable hours. |
| 3 — Keeping revenue | R03 Ops Coordinator, R04 Growth Associate, R13 Patient Care | Protect conversion and retention. |
| 4 — Running the company | R07 HR, R08 Finance | Hire before headcount and payroll make errors likely, not after. |
| 5 — Programme expansion | R10 SLT, R12 Nurse-Midwife, R11 Marketing | Only when the programme has the enrolments in the trigger table. |
| 6 — Optional | T01 Platform Engineer | Funded roadmap only. |

---

## 5. Hiring triggers

A requisition opens when its trigger has held for the stated period, as shown in the CRM, calendar and finance reports. The hiring manager raises the request with the evidence; the Managing Director approves.

| ID | Open the requisition when… | Pause or cancel if… |
|---|---|---|
| R01 | Nurse home visits exceed 25 per week for 4 consecutive weeks, or visits are being pushed more than 3 working days | Visits fall below 15 per week for 4 weeks |
| R02 | Home sample collections exceed 20 per week, or rejected or haemolysed samples exceed 5% in a month | Lab partner takes over home collection under contract |
| R03 | Clinicians report more than 4 hours a week each on scheduling and chasing, or follow-ups overdue exceed 15 at month end | — |
| R04 | New leads exceed 120 per month, or more than 10% of leads have no next step after 48 hours | Lead volume drops below 60 per month for 2 months |
| L01 | Any planned leave, or physician utilisation above 80% for 2 weeks | — |
| R05 | Nutrition counselling and programme meal plans exceed 30 per month | — |
| R06 | Before any expansion of the dispensary range or a second dispensing location; immediately if PCN inspection is pending without a pharmacist in place | Never paused while the dispensary operates |
| R07 | Headcount reaches 12, or founders spend more than one day a week on HR and payroll | — |
| R08 | More than 150 billing transactions a month, or any late statutory remittance | — |
| T01 | Product roadmap funded and approved for at least two quarters | Roadmap not funded |
| R09 | Physician utilisation above 85% for 6 weeks, or new-patient wait above 10 working days, or locum spend above ₦600,000 a month for 2 months (to confirm) | Utilisation below 65% for 6 weeks |
| R10 | 8 or more active Autism Support enrolments needing speech therapy | Fewer than 5 for 2 months |
| R11 | Marketing budget for the year approved and blog cadence below 4 posts a month | — |
| R12 | 10 or more active Maternal Wellness enrolments | Fewer than 5 for 2 months |
| R13 | Median first response to patient messages above 2 working hours for 4 weeks | — |

**Company-wide freeze rule:** if cash runway falls below 6 months, freeze priorities 3–6 and review priorities 1–2 with the Managing Director.

---

## 6. Hiring budget

### Salary bands (placeholders)

All bands are **monthly gross in ₦, to confirm** against a market survey (recruiter data, peer clinics, professional associations) before any requisition opens. Bands must sit at or above the national minimum wage (₦70,000 a month under the 2024 amendment; confirm with counsel for any later change).

| Band | Roles | Monthly gross range (₦, to confirm) | Midpoint used for budget |
|---|---|---|---|
| B1 | R13 Patient Care Associate | ₦180,000 – ₦260,000 (to confirm) | ₦220,000 |
| B2 | R04 Patient Growth Associate (plus commission), R11 Marketing Executive | ₦200,000 – ₦400,000 (to confirm) | ₦250,000 (R04), ₦325,000 (R11) |
| B3 | R03 Ops Coordinator, R07 HR and Admin Officer | ₦300,000 – ₦450,000 (to confirm) | ₦375,000 |
| B4 | R01 Nurse, R02 MLS, R05 Dietitian, R08 Finance Officer | ₦350,000 – ₦550,000 (to confirm) | ₦425,000 – ₦450,000 |
| B5 | R12 Nurse-Midwife | ₦400,000 – ₦600,000 (to confirm) | ₦500,000 |
| B6 | R09 Medical Officer | ₦900,000 – ₦1,400,000 (to confirm) | ₦1,150,000 |
| P (part-time) | R06 Superintendent Pharmacist | ₦250,000 – ₦400,000 for agreed days (to confirm) | ₦325,000 |
| S (sessional) | L01 Locum Physicians, R10 SLT | Locum ₦40,000 – ₦70,000 per session; SLT ₦25,000 – ₦40,000 per session (to confirm) | See table |
| C (contract) | T01 Platform Engineer | ₦400,000 – ₦600,000 a month at about half-time (to confirm) | ₦500,000 |

Pay is split into basic, housing and transport allowances (the pension base is these three combined under the Pension Reform Act 2014; confirm the split with accountant). Commission plans for R04 are written separately and capped.

### 2027 cost by role

Months in 2027 count from the target start. Employer on-costs are budgeted at 12% of gross pay for employees only (contractors, locums and sessional staff excluded): employer pension 10%, NSITF Employees' Compensation Scheme 1% of payroll and ITF 1% of annual payroll. Group life insurance (required under the Pension Reform Act 2014) and any HMO cover are budgeted separately. Confirm every rate and threshold with accountant.

| ID | Role | Months in 2027 | Monthly midpoint (₦, to confirm) | 2027 gross pay (₦) | Employer on-costs 12% (₦) | 2027 total (₦) |
|---|---|---|---|---|---|---|
| R01 | Home-Visit Registered Nurse | 11 | 450,000 | 4,950,000 | 594,000 | 5,544,000 |
| R02 | Medical Laboratory Scientist | 11 | 425,000 | 4,675,000 | 561,000 | 5,236,000 |
| R03 | Clinical Operations Coordinator | 10 | 375,000 | 3,750,000 | 450,000 | 4,200,000 |
| R04 | Patient Growth Associate (base only) | 10 | 250,000 | 2,500,000 | 300,000 | 2,800,000 |
| L01 | Locum Physician pool | 11 | 250,000 (≈5 sessions) | 2,750,000 | — | 2,750,000 |
| R05 | Clinical Dietitian | 8 | 450,000 | 3,600,000 | 432,000 | 4,032,000 |
| R06 | Superintendent Pharmacist (part-time) | 8 | 325,000 | 2,600,000 | 312,000 | 2,912,000 |
| R07 | HR and Admin Officer | 7 | 375,000 | 2,625,000 | 315,000 | 2,940,000 |
| R08 | Finance and Accounts Officer | 7 | 425,000 | 2,975,000 | 357,000 | 3,332,000 |
| T01 | Platform Engineer (conditional) | 7 | 500,000 | 3,500,000 | — | 3,500,000 |
| R09 | Medical Officer | 5 | 1,150,000 | 5,750,000 | 690,000 | 6,440,000 |
| R10 | Speech and Language Therapist (sessional) | 5 | 400,000 (≈12 sessions) | 2,000,000 | — | 2,000,000 |
| R11 | Content and Community Marketing Executive | 4 | 325,000 | 1,300,000 | 156,000 | 1,456,000 |
| R12 | Registered Nurse-Midwife | 2 | 500,000 | 1,000,000 | 120,000 | 1,120,000 |
| R13 | Patient Care Associate | 2 | 220,000 | 440,000 | 52,800 | 492,800 |
| | **Pay subtotal** | | | **44,415,000** | **4,339,800** | **48,754,800** |

Full-year run rate from January 2028, once everyone is in post, is about ₦77 million a year in gross pay at band midpoints, or about ₦85 million with employer on-costs (to confirm when bands are set). Budget the step-up now.

### One-off hiring costs

| Item | Basis (placeholder, to confirm) | Count | 2027 cost (₦) |
|---|---|---|---|
| Job board and LinkedIn adverts | ₦75,000 per role | 14 | 1,050,000 |
| Recruitment agency fee | 10–15% of first-year gross, only for R09 and R06 if direct sourcing fails in 6 weeks | 2 | 2,000,000 |
| Credential, reference and background checks | ₦30,000 per hire (14 hires + 2 locums) | 16 | 480,000 |
| Pre-employment medical (incl. Hepatitis B status for clinical, with consent) | ₦25,000 per hire | 14 | 350,000 |
| Equipment: laptop or tablet, phone line, uniforms | ₦450,000 per hire (T01 uses own equipment) | 13 | 5,850,000 |
| Home-visit kit (BP monitor, glucometer, phlebotomy kit, cool box) | ₦250,000 per field clinician | 4 | 1,000,000 |
| Professional indemnity top-up and group life additions | Quote from broker | — | 1,500,000 |
| Contingency | 10% of one-off costs | — | 1,223,000 |
| **One-off subtotal** | | | **13,453,000** |

### Budget summary

| Line | 2027 (₦, to confirm) |
|---|---|
| Pay (gross) | 44,415,000 |
| Employer on-costs | 4,339,800 |
| One-off hiring costs | 13,453,000 |
| R04 commission (cap, separate plan) | 2,400,000 |
| **Total 2027 hiring budget** | **64,607,800** |
| Of which conditional (T01) | 3,500,000 |

---

## 7. Statutory and payroll set-up before the first 2027 hire

Each item needs confirmation from the accountant or counsel before it is relied on.

| Item | What to do | Confirm with |
|---|---|---|
| Pension (Pension Reform Act 2014) | Employee 8%, employer 10% of basic + housing + transport; remit to each employee's chosen PFA within 7 working days of payday; new hires without an RSA open one in the first month | Accountant |
| Group life insurance | Cover each employee for at least 3× annual total emoluments | Accountant / broker |
| NHF | Deduct 2.5% of basic salary from eligible employees and remit to the Federal Mortgage Bank of Nigeria; check current rules and who is exempt | Accountant |
| PAYE | Register with Lagos State Internal Revenue Service; compute under the Nigeria Tax Act 2025 bands in force from January 2026; file annual employer returns | Accountant |
| ITF | Contribute 1% of annual payroll once the headcount or turnover threshold is met; keep evidence of staff training (the training LMS helps with reimbursement claims) | Accountant |
| NSITF / ECS | Register and contribute 1% of total monthly payroll under the Employees' Compensation Act 2010 | Accountant |
| Contracts | Written terms for every employee within the time the Labour Act requires; separate contractor and locum agreements that do not create employment by accident | Counsel |
| Health facility registration | Keep a current staff list with licence numbers for HEFAMAA inspection | Counsel |

---

## 8. Review cadence

| When | Who | What |
|---|---|---|
| Monthly | Head of Talent Acquisition, Managing Director | Trigger dashboard; open requisitions; time-to-hire; spend vs budget |
| Quarterly | Leadership team | Re-order priorities; move roles between quarters; confirm next quarter's requisitions |
| December 2027 | Leadership team | Write the 2028 plan from actual utilisation and revenue |

---

## Open questions

- Current headcount by department (Section 1).
- Salary bands: who runs the market check, and by when.
- Whether to add `hr` and `finance` roles to the portal before R07 and R08 start.
- Which PCN registration category the supplement dispensary falls under (confirm with counsel).
- Whether the lab partner contract already covers home sample collection (affects R02).
- Commission plan for R04 and any ambassador overlap.
