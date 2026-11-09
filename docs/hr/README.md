# FXMed HR

The HR policies and processes for FXMed, and how they map to the **HR** tab in the admin portal. Training content is separate: it lives in [`docs/new-hire-training-plan.md`](../new-hire-training-plan.md) and runs from the **Training** tab.

## Documents

| Document | What it covers |
|---|---|
| [hiring-plan.md](hiring-plan.md) | 2027 headcount plan, priorities, hiring triggers and budget |
| [job-descriptions.md](job-descriptions.md) | JDs for each planned role (R01–R13, L01, T01) |
| [recruiting-process.md](recruiting-process.md) | Pipeline stages and time limits, interview loops, scorecards, references and checks, offer approval, fairness, candidate data |
| [onboarding.md](onboarding.md) | Offer accepted to probation sign-off: pre-start checklist, day one, week one, 30/60/90 check-ins |
| [employee-records.md](employee-records.md) | What is on a staff file, who can see it, how long it is kept, licence expiry tracking, NDPA requests |
| [performance-management.md](performance-management.md) | Probation, goals, rating scale, role KPIs, appraisals, improvement plans |
| [leave-policy.md](leave-policy.md) | Leave types and entitlements, public holidays, how to request and approve leave |
| [compensation-and-payroll.md](compensation-and-payroll.md) | Levels, salary bands, commission, allowances, payroll calendar, statutory deductions, raises |
| [offboarding.md](offboarding.md) | Notice, leaver checklist, same-day access removal, final pay, exit interview, references |
| [disciplinary-and-grievance.md](disciplinary-and-grievance.md) | Disciplinary and grievance procedures and appeals |
| [employee-handbook.md](employee-handbook.md) | Conduct, hours, home visits, confidentiality, health and safety, whistleblowing |

Several documents end with "Before rolling this out" or "Open questions". Those items (counsel review, confirmed salary bands, statutory rates) are still open.

## The HR tab

Every dashboard role (admin, clinical, sales) has the HR tab. What a person sees depends on their role and on how they relate to each record. The `/api/admin/hr/*` routes enforce this with `canHr` in `lib/hr.ts`; the screens only show what the API returns.

**Admin** (Managing Director, Medical Director, People Ops) sees three areas:

- **Recruiting:** the pipeline per opening through the 14 stages with time-limit flags, application files (interviews, debrief against the decision rules, references and checks, offer and hire), requisitions, scorecard templates, candidate retention, and their own interviews.
- **People & Onboarding:** staff files, linking portal accounts, payroll identifiers, documents, licences and checks, the monthly licence report, onboarding templates and checklists, NDPA data requests and the retention log.
- **Performance, Leave & Pay:** probation check-ins and decisions, appraisals and calibration, goals, improvement plans, the leave queue, leave balances and public holidays, salary bands and compensation history, and offboarding cases.

**Clinical and sales staff** see:

- **My file & onboarding:** their own file and personal details, their onboarding checklist (they tick items owned by the new starter), their documents and licences (they upload documents and submit renewals). Line managers also get **My team**, a read-only list of their direct reports.
- **Performance & leave:** their reviews, goals, improvement plans, leave balances and requests, pay history and their own leaver checklist. Line managers also see their reports' reviews, goals and leave, and decide their reports' leave within the manager limit.
- **My interviews:** interviews they are assigned to, the candidate summary and CV for those applications, and their own scorecard.

## Who can see what

| Record | Employee (own) | Line manager (direct reports) | Assigned interviewer | Admin |
|---|---|---|---|---|
| Work details (job, department, reporting line, work pattern) | Read | Read | — | All |
| Personal details, emergency contacts, bank and statutory IDs | Read | — | — | All |
| Documents | Read, upload | — | — | All |
| Restricted documents (health, checks, references, guarantor) | Open own, except reference responses and guarantor forms | — | — | All |
| Licences and credentials | Read, submit renewal | Read | — | All, and verifies |
| Onboarding checklist | Tick new-starter items | Tick line-manager items | — | All, and approves exceptions |
| Reviews, goals, improvement plans | Self-review, comment, acknowledge, goal progress | Manager review, agree goals, plan check-ins | — | All, calibration, probation decisions, plan outcomes |
| Leave | Request, cancel | Decide manager-level leave up to 10 working days | — | All; the MD decides the rest |
| Sick-leave reasons and medical evidence | Read | — | — | All |
| Pay (compensation history, final pay) | Read | — | — | All |
| Salary bands, offers, references | — | — | — | All |
| Candidate summary and CV | — | — | For assigned, open applications | All |
| Scorecards | — | — | Own scorecard only | All, and unlocks submitted ones |
| Exit interviews, data requests, retention log | — | — | — | All |

Nobody except admin sees anyone else's pay. Managers never see pay, personal details or restricted records. Every view or change of a staff file is written to the activity log (module `hr`).

## Not built yet

- Emails and reminders: candidate acknowledgements and rejections, offer letters, licence expiry reminders and the monthly licence report are recorded or shown on screen, but nothing is sent.
- Retention runs only when admin clicks "Run retention now" (no scheduled job).
- The equipment register, conduct and grievance cases, whistleblowing, payroll runs and payslips, commission, allowance claims and statutory rates.
- An accountant or payroll role. The employee-records access key has a Finance column, but there is no matching dashboard role.
- The system cannot tell the Managing Director from the Medical Director; both are admin. On offer and requisition approvals the approving admin chooses which one they are signing as.

## Database

Migrations `041_add_hr_system.sql` (all HR tables and the private `hr-documents` bucket) and `042_hr_recruiting.sql` (requisitions and scorecard conflict checks). All HR tables are server-managed: RLS is on, there are no browser policies, and access goes only through the HR API routes using the service role.
