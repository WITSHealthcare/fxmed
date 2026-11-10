# FXMed Offboarding

This document sets out what happens when someone leaves FXMed, whether they resign, their contract ends, or the clinic ends their employment: notice, handing over patients and leads, the exit interview, removing their portal and system access on their last day, getting equipment and records back, final pay, and references. The aim is that no patient is left without a named clinician, no lead goes cold, no former employee can see patient data the day after they leave, and the person is treated fairly and paid correctly.

Owner: Compensation and Performance Manager (to assign), with the Admin who manages Users & Roles

---

## 1. Ways people leave

| Type | Started by | Notes |
|---|---|---|
| Resignation | Employee | Written (email is fine) to their manager, copied to the HR owner |
| End of fixed-term contract, locum or internship | Contract | Confirm end date in writing 2 weeks ahead; no notice needed beyond the contract |
| Termination with notice | FXMed | For capability (after a PIP, see `performance-management.md`), redundancy, or failed probation |
| Summary dismissal | FXMed | Gross misconduct only, after investigation and a hearing (section 3) |
| Retirement, death in service, mutual agreement | Either | Handled case by case with counsel; death in service involves group life insurance and pension next of kin |

---

## 2. Notice

The employment contract sets the notice period. It may not be shorter than the Labour Act minimum where the Labour Act applies (confirm with counsel; the Labour Act covers "workers" and may not apply to all professional and managerial staff, whose contracts then govern).

| Continuous service | Labour Act minimum (either side) | FXMed contract default (to confirm) |
|---|---|---|
| Under 3 months | 1 day | 1 week (probation) |
| 3 months – 2 years | 1 week | 1 month |
| 2 – 5 years | 2 weeks | 1 month (L1–L3), 2 months (L4–L5) |
| 5 years and over | 1 month | 2 months |

(confirm with counsel for the Labour Act figures and how they interact with contract terms)

- Either side may pay salary in lieu of notice instead of requiring the notice to be worked, if the contract allows.
- FXMed may ask a leaver to stay away from work during notice (garden leave) and remove access early, on full pay.
- Notice is given in writing and must be acknowledged. Accrued annual leave can be taken during notice only by agreement; otherwise it is paid out (section 7).
- Clinical staff are asked to give enough notice to hand over their patients safely; the contract notice for clinical L3+ should reflect this.

---

## 3. Termination by FXMed

FXMed follows a fair process even where the contract or law would allow less, because it is the right thing to do and the National Industrial Court looks at fairness (confirm with counsel before any termination).

**Capability or failed probation.** The PIP or probation record shows the concern, the support given and the chance to improve. Decision given in a meeting, then in writing, with reasons and notice terms.

**Misconduct.**

1. **Query** (show-cause letter) in writing, stating the allegation and evidence, with at least 48 hours to respond in writing.
2. **Suspension on full pay** during investigation where patient safety or evidence requires it. Portal access is suspended the same day (section 5).
3. **Investigation** by someone not involved.
4. **Hearing**: the employee can respond and bring a colleague.
5. **Decision** in writing: no action, warning, final warning, termination with notice, or summary dismissal for gross misconduct.
6. **Appeal** within 5 working days to the founder or a manager not involved.

Gross misconduct examples: deliberately sharing patient data (for example on a personal WhatsApp or social media), falsifying records or lab results, theft (including from the dispensary), working while a practising licence has lapsed, practising beyond scope, harassment, violence, accepting inducements from suppliers or labs, and coercive selling to vulnerable patients.

**Professional reporting.** Where a clinician leaves following serious concerns about practice, counsel advises whether FXMed must or should report to the relevant council (MDCN, NMCN, PCN, MLSCN, Dietitians Council of Nigeria) (confirm with counsel). Data breaches may need reporting to the Nigeria Data Protection Commission within the statutory window (72 hours under the NDPA where the breach is likely to put people at risk) (confirm with counsel).

**Redundancy.** If roles are cut, the Labour Act requires informing worker representatives and applying fair selection, with redundancy payments as negotiated (confirm with counsel). Get advice before announcing anything.

---

## 4. Leaver checklist and timeline

| When | Task | Who |
|---|---|---|
| Notice received / given (day 0) | Record leave type, notice date, last working day in the HR system; acknowledge in writing | HR owner |
| Day 0–2 | Handover plan agreed: patients, follow-ups, open leads, deals, pending lab results, training they run | Manager |
| Day 0–2 | Tell payroll; stop any future-dated allowances or commission after the last day | HR owner |
| During notice | Clinical: reassign every active patient to a named clinician; tell patients of the change where appropriate; complete all notes | Clinical lead |
| During notice | Sales: reassign open leads and deals in the financial CRM with a next step and date; hand over ambassador and corporate contacts | Sales lead |
| During notice | Reassign follow-ups and appointments in the portal; move any training programmes they own to a new owner | Manager / Admin |
| Last week | Exit interview booked | HR owner |
| **Last working day** | **Access removed** (section 5), equipment returned (section 6) | Admin + manager |
| Last day + 1 | Confirm access-removal checklist complete and signed | Admin |
| Next payroll or earlier as agreed | Final pay (section 7) | Payroll |
| Within 2 weeks of leaving | Certificate of service / confirmation letter issued | HR owner |

For summary dismissal or a leaver who is a security risk, access is removed **before or during** the meeting where they are told, and handover is done by the manager from the records.

---

## 5. Same-day access removal

Access ends on the last working day (or at the start of garden leave or suspension), not at the end of the month.

### The FXMed portal

1. In **Users & Roles**, deactivate the user. This bans the Supabase account and sets `dashboard_active` to false; the admin API checks the authoritative auth record on every request, so access to portal data stops immediately even if the browser still has a session.
2. Check the action appears in the activity log (`deactivate_user`, module Users & Roles).
3. Do not delete the account: it keeps the audit trail, authorship of notes, and training records linked. Deactivated accounts stay deactivated.
4. If the leaver was the only active Admin, make someone else Admin first (the portal will not let the last active Admin be deactivated).
5. If the leaver knew shared credentials (for example a shared mailbox or a tool login), change them the same day.

### Everything else (list to be completed by the clinic)

| System | Action |
|---|---|
| Work email and shared calendars | Suspend; set auto-reply naming who to contact; forward to manager for 30 days (tell the leaver) |
| WhatsApp Business / clinic phone lines | Remove from business accounts and groups; return clinic SIMs |
| Lab partner portals, pharmacy suppliers, HMO portals | Remove user or change shared login |
| Payment and banking (POS, transfer approvals, Paystack/Flutterwave or similar) | Remove signatory or user rights |
| Social media and website CMS, Google Analytics / SEO tools | Remove access |
| Hosting, Supabase, Vercel, code repositories (Technology staff) | Remove from organisation; rotate any keys they handled |
| Building keys, gate passes, dispensary keys | Collect; change dispensary lock or code if a key is missing |

The Admin signs off the checklist and records the time each item was done.

### Monthly access review

Every month, the Admin compares the active users in Users & Roles against the staff list in the HR system and deactivates anyone who should not have access (as in the Platform Admin module of `docs/new-hire-training-plan.md`).

---

## 6. Return of equipment and records

| Item | Checked by |
|---|---|
| Laptop, tablet, phone, chargers | Admin: wipe or reset after confirming no patient data is held only on the device |
| Clinic SIM cards, MiFi | Admin |
| Medical bag and equipment (BP monitor, glucometer, pulse oximeter, phlebotomy kit, scales) | Clinical lead: count and condition |
| Dispensary stock and samples held for home visits | Clinical lead / pharmacist: reconcile against stock records |
| ID card, uniform, keys, access cards | Manager |
| Paper records, consent forms, sample request forms | Manager: back to the clinic, none kept by the leaver |

The leaver confirms in writing that they have deleted any FXMed patient or business data from personal devices and accounts (personal phone, personal WhatsApp, personal email, cloud drives), as required by the Nigeria Data Protection Act 2023 and their confidentiality terms. Confidentiality continues after they leave.

Unreturned equipment: ask in writing, then agree repayment. Only deduct the cost from final pay if the employee agrees in writing (confirm with counsel).

---

## 7. Final pay

Paid with the next regular payroll, or earlier if agreed (confirm with counsel whether a shorter deadline applies).

| Item | Included |
|---|---|
| Salary up to the last working day (pro-rated by working days) | Yes |
| Salary in lieu of notice, if notice is not worked | Yes |
| Accrued but untaken annual leave | Yes, at basic daily rate (to confirm) |
| Home-visit and other allowances for work done up to the last day | Yes, claims by the last day |
| Commission for first consultations attended up to the last day | Yes, on the normal rules; clawback still applies for 30 days |
| Redundancy or agreed severance | Per agreement (confirm with counsel) |
| Deductions | PAYE, pension (8% / employer 10%), NHF as usual; agreed advances or equipment only with written consent |

After final pay:

- Remit the final pension contribution to the leaver's PFA and confirm in writing; the employee keeps their RSA and PIN.
- Give a final payslip and a statement of pay and tax deducted for the year to date (for the next employer and their own filing).
- Notify group life insurance and any health plan of the end date.
- Summary dismissal does not cancel pay already earned or pension contributions.

---

## 8. Exit interview

Held in the last week by someone other than the line manager (HR owner or Admin), 30 minutes, in person or by call. Voluntary.

Questions:

1. Why are you leaving?
2. What did FXMed do well for you?
3. What should we change (workload, pay, management, tools, home-visit logistics)?
4. Did you ever feel pressure to recommend, sell or say something that was not in the patient's interest? (Follow up any "yes" with the clinical lead, confidentially.)
5. Was the training and onboarding enough for the job?
6. Would you recommend FXMed as a place to work? (0–10)
7. Would you consider coming back?

Answers are kept confidential and reported to the founder in a quarterly anonymised summary (themes only; no names if fewer than 3 leavers in the quarter). The interview can be recorded as a survey form in the HR system, as the Training tab does for survey lessons.

---

## 9. References

- Only the HR owner or a named manager gives references, in writing, on FXMed letterhead.
- **Standard reference**: dates of employment, job title, level. Given to anyone the leaver authorises.
- **Full reference** (performance, conduct, reason for leaving) only with the leaver's written consent and kept factual and fair; never mention health, family or other sensitive data (Nigeria Data Protection Act 2023).
- For clinical staff, answer the new employer's or council's questions about conduct and fitness to practise truthfully, including concerns that were found to be true (confirm with counsel).
- Keep a copy of every reference given.
- Rehire eligibility (yes / no / with conditions) is recorded at exit.

---

## 10. Records after someone leaves

| Record | Keep for (to confirm) |
|---|---|
| Personnel file, contract, appraisals, disciplinary records | Employment + 6 years (confirm with counsel) |
| Payroll, tax and pension records | At least 6 years (confirm with accountant) |
| Clinical notes they wrote | As patient records, under the clinic's medical records policy; not removed when staff leave |
| Portal account and activity log | Account deactivated, not deleted; logs kept as the audit trail |
| Exit interview | 2 years, then anonymised |

## Before rolling this out

- Counsel to confirm notice periods, the disciplinary process, redundancy steps, the final-pay deadline and retention periods.
- Admin to complete the "everything else" system list with the clinic's actual tools.
- Add the leaver checklist as a printable form, or as a record in the HR system once built.
