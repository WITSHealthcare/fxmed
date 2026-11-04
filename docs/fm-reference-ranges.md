# FM Lab Analysis — reference ranges and interpretation

This is the clinical basis of the FM Lab Analysis in the admin portal: how each result is judged, how the report's likelihood scores and alarms are worked out, and every default range. The table at the end is generated from `lib/fmBiomarkers.ts`, so it matches what the analysis uses. Please have a clinician sign it off, and review it again whenever the ranges change.

## How a result is judged

Each result is compared with two ranges:

- **Lab range:** the laboratory's own reference range. When a lab report is imported, the range printed on it is used. The catalogue range below only fills a gap.
- **FM optimal range:** the narrower functional-medicine range. For thyroid antibodies, the lab's own cut-off is used instead (see below).

From those two ranges, each result falls into one band:

| Band | Meaning |
|---|---|
| Optimal | Within the FM optimal range |
| Below / Above Optimal | Outside FM optimal, inside the lab range |
| Below / Above Standard | Outside both ranges |
| Alarm Low / High | Past a clinical action value (below). Flagged "needs prompt medical review" |

Where the FM range deliberately extends past the lab's (a high HDL, a supplemented B12), the FM judgement stands.

## Likelihood scores

Each body system, nutrient area and health improvement area is scored from the markers that bear on it, each with a weight from 1 (supporting) to 3 (key). A marker outside the standard range counts fully; one outside optimal only counts 0.6. A result inside the optimal range counts nothing. The counts combine as independent evidence:

- One key marker outside optimal only: ~51% ("possible")
- One key marker outside the standard range: ~85% ("likely")
- Several markers outside the standard range: 90%+ ("highly likely")

An area enters the health improvement plan at 50% or more, or when one of its key markers is at an alarm value.

## Changes in the November 2026 review

A clinically unremarkable adult used to come out with 18–19 markers flagged and 12–13 improvement areas at 70–98%. After this review, the same results give 4–5 flagged markers (LDL 2.7, vitamin D 34, B12 350, hs-CRP 1.2), each reading as "possible" (51–68%). Real disease still scores 85–100%: uncontrolled diabetes, CKD, iron-deficiency anaemia, Hashimoto's, fatty liver.

**Ranges corrected**
- **hs-CRP:** lab range was 0–1 mg/L, now <3 (AHA high-risk threshold); FM optimal <1. An hs-CRP of 1.2 used to show as outside the standard range.
- **HDL:** lab range no longer has an upper limit (labs report ≥1.0 men, ≥1.2 women). FM optimal is 1.2–2.3 (men) and 1.3–2.5 (women), down from a 1.55 floor.
- **Triglycerides:** FM optimal is 0.5–1.1 mmol/L (≈45–100 mg/dL), up from <0.9. Above 5.6 is an action value (pancreatitis risk).
- **HOMA-IR:** lab <2.5 (was 0.5–1.4); FM <1.5.
- **ApoB, GGT and similar:** a low result is no longer flagged as abnormal where a low value is favourable.
- **Free T3 / Free T4:** FM optimal is 4.6–6.2 and 13–20 pmol/L, down from 5–6.5 and 15–23, which flagged most normal adults.
- **Thyroid antibodies:** the FM range follows the lab's own cut-off. The old "<2 IU/mL" is below many assays' detection limit and flagged negative results.
- **WBC / neutrophils:** lab 3.0–10.5 and 1.0–7.0 ×10⁹/L, to allow for benign ethnic neutropenia, which is common in Nigerian patients. FM floors are 3.5 and 1.4.
- **eGFR:** no upper limit. Lab ≥60, FM ≥90. The action value is <30 (CKD G4), down from <60.
- **Estradiol / progesterone (women):** the FM range equals the lab range, because both vary with the cycle phase and the analysis doesn't know the sample day.
- **B12 and folate:** no low FM upper limit, so supplemented levels aren't flagged. FM floors are B12 370 pmol/L and folate 15 nmol/L.
- **Vitamin D:** FM optimal is 40–80 ng/mL, down from 50–80. The lab's "sufficient" from 30 is unchanged.
- **Male DHEA-S:** now has its own ranges (lab 4.3–12.2, FM 6–12 µmol/L).
- **Smaller moves:** female creatinine FM upper limit 80; ALP FM 40–100; sodium FM 137–143; potassium FM 4.0–4.8; RDW and NLR low limits relaxed.

**Units**
- **Urea vs BUN:** urea in mg/dL is now converted ×6.0, and BUN is its own test (mg/dL, lab 7–20, FM 10–16). Before this, urea in mg/dL was treated as BUN.
- **Transferrin:** now converts from g/L and mg/dL.
- **Cortisol:** uses µg/dL, converting from nmol/L (fixed in the previous release).

**Alarms**
- The old rule ("more than a third beyond a lab limit") is replaced by explicit action values (table below), compared after unit conversion. It used to call ferritin 400, LDL 4.6 or anti-TPO 600 alarms.
- Lp(a) is no longer an alarm marker. It is a risk enhancer, not an urgent finding.

**Scoring**
- A marker outside optimal only counts 0.6, down from 0.8.
- Borderline results inside the optimal range no longer add to scores.

## Open questions for clinical sign-off

1. **Age-adjusted ranges.** DHEA-S and testosterone fall with age, but the catalogue uses one adult range. Older patients will read low.
2. **Cycle phase.** Should the analysis ask for the cycle day, so estradiol and progesterone can be judged against the right phase?
3. **Vitamin D.** Is 40–80 ng/mL the optimal range the clinic wants?
4. **Fasting status.** "Glucose" is assumed to be fasting. A random glucose will be judged against fasting ranges.
5. **Antibody assays.** The thyroid antibody defaults (TPO <34, Tg <40) only apply when the lab prints no range. Most labs do print one.

## Default ranges

In each marker's catalogue unit. Results in other units are converted where a factor is known.

### Cardio-Metabolic

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| Total Cholesterol | mmol/L | 3–5.2 | 3.6–5.2 |  |  |
| LDL Cholesterol | mmol/L | 0–3.4 | 0–2.6 | > 4.9 |  |
| HDL Cholesterol | mmol/L | >1 | 1.2–2.3 |  | F: lab >1.2, FM 1.3–2.5 |
| Triglycerides | mmol/L | 0–1.7 | 0.5–1.1 | > 5.6 |  |
| Lipoprotein (a) | mg/dL | 0–30 | 0–30 |  |  |
| Apolipoprotein A1 | g/L | 1.2–2.4 | 1.4–2.2 |  |  |
| Apolipoprotein B | g/L | 0–1.2 | 0–0.9 |  |  |
| Non-HDL Cholesterol | mmol/L | 0–4.1 | 0–3.4 |  |  |
| Chol./HDL Ratio | ratio | 0–5 | 0–4 |  |  |
| Triglyceride/HDL Ratio | ratio | 0–1.7 | 0–0.9 |  |  |

### Glucose Metabolism

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| Fasting Glucose | mmol/L | 3.9–6 | 4.4–5.5 | < 3 or > 11.1 |  |
| HbA1c | % | 4–5.6 | 4–5.4 | > 9 |  |
| HbA1c (IFCC) | mmol/mol | 20–38 | 20–36 |  |  |
| Fasting Insulin | µIU/mL | 2.6–24.9 | 2.6–8 |  |  |
| C-Peptide | pmol/L | 298–1324 | 298–900 |  |  |
| HOMA-IR | index | 0–2.5 | 0–1.5 |  |  |
| Glucose/Insulin Ratio | ratio | >4.5 | >4.5 |  |  |
| QUICKI Index | index | 0.33–0.45 | 0.35–0.45 |  |  |

### Thyroid Panel

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| TSH | µIU/mL | 0.4–4 | 1–2.5 | < 0.1 or > 10 |  |
| Free T3 | pmol/L | 3.5–6.5 | 4.6–6.2 |  |  |
| Free T4 | pmol/L | 10–23 | 13–20 |  |  |
| Reverse T3 | ng/mL | 0.09–0.35 | 0.09–0.2 |  |  |
| Anti-TPO Ab | IU/mL | 0–34 | Lab's own cut-off |  |  |
| Anti-TG Ab | IU/mL | 0–40 | Lab's own cut-off |  |  |

### Adrenal & Hormone Panel

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| DHEA-S | µmol/L | 2.68–9.23 | 3.5–9.2 |  | M: lab 4.3–12.2, FM 6–12 |
| Cortisol AM | µg/dL | 6.2–19.4 | 10–15 | < 3 |  |
| Cortisol PM | µg/dL | 2.3–11.9 | 3–8 |  |  |
| Testosterone | nmol/L | 0.5–2.6 | 0.7–2 |  | M: lab 8.6–29, FM 15–28 |
| SHBG | nmol/L | 18–114 | 18–80 |  | M: lab 18–54, FM 20–50 |
| Free Testosterone | pmol/L | 0–26 | 5–18 |  | M: lab 174–729, FM 350–700 |
| Free Testosterone Index | ratio | 0.5–5 | 1–3.5 |  | M: lab 35–92, FM 50–90 |
| Estradiol (E2) | pmol/L | 45–1460 | 45–1460 |  | M: lab 40–160, FM 70–150 |
| Progesterone | nmol/L | 0.2–90 | 0.2–90 |  | M: lab 0.2–1.3, FM 0.3–1.3 |

### Kidney Function

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| Creatinine | µmol/L | 44–80 | 50–80 |  | M: lab 62–106, FM 65–100 |
| eGFR | mL/min/1.73 m² | >60 | >90 | < 30 |  |
| Urea | mmol/L | 2.5–7.8 | 3–6.5 |  |  |
| BUN | mg/dL | 7–20 | 10–16 |  |  |
| Uric Acid | mmol/L | 0.15–0.36 | 0.18–0.3 | > 0.6 | M: lab 0.2–0.43, FM 0.21–0.33 |
| Protein/Creatinine Ratio | g/g | 0–0.2 | 0–0.15 |  |  |
| Amylase | IU/L | 30–110 | 30–100 |  |  |
| U-Creatinine | g/L | 0.15–1.5 | 0.3–1.2 |  |  |
| U-Protein | g/L | 0–0.15 | 0–0.08 |  |  |

### Liver Function & Detoxification

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| ALT (SGPT) | IU/L | 7–55 | 7–35 | > 200 |  |
| AST (SGOT) | IU/L | 10–40 | 10–26 | > 200 |  |
| GGT | IU/L | 0–55 | 0–30 |  | F: lab 0–38, FM 0–30 |
| Alk. Phosphatase | IU/L | 30–120 | 40–100 |  |  |
| Bilirubin (Total) | µmol/L | 3–21 | 5–17 | > 50 |  |
| Bilirubin (Conj.) | µmol/L | 0–5 | 0–4 |  |  |
| Albumin | g/L | 35–50 | 40–50 | < 25 |  |
| Total Protein | g/L | 60–80 | 65–80 |  |  |
| Globulin | g/L | 20–35 | 24–30 |  |  |
| AST/ALT Ratio | ratio | 0–2 | 0.6–1.2 |  |  |
| LDH | IU/L | 120–246 | 140–200 |  |  |
| Alpha-1 Antitrypsin | mg/dL | 90–200 | 100–180 |  |  |

### Methylation Panel

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| Vitamin B12 | pmol/L | 133–675 | 370–1000 | < 110 |  |
| Folate (Serum) | nmol/L | 7–46 | >15 |  |  |
| Homocysteine | µmol/L | 0–15 | 0–10 | > 30 |  |

### Hematology

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| RBC Count | ×10¹²/L | 3.8–5.8 | 4–5 |  | M: lab 4.5–5.9, FM 4.4–5.4 |
| Hemoglobin | g/dL | 11.5–16.5 | 12–14.5 | < 8 | M: lab 13–17.5, FM 14–16 |
| Hematocrit | % | 36–47 | 37–44 |  | M: lab 40–52, FM 42–48 |
| MCV | fL | 76–99 | 82–92 |  |  |
| MCH | pg | 26–34 | 27–32 |  |  |
| MCHC | g/dL | 30–37 | 32–36 |  |  |
| RDW | % | 10–14.5 | 10.5–13.5 |  |  |
| Platelets | ×10⁹/L | 150–450 | 175–350 | < 50 or > 1000 |  |
| WBC Count | ×10⁹/L | 3–10.5 | 3.5–7.5 | < 2 or > 25 |  |
| Neutrophils | ×10⁹/L | 1–7 | 1.4–4.5 | < 0.5 |  |
| Lymphocytes | ×10⁹/L | 1–4 | 1.5–3.1 |  |  |
| Monocytes | ×10⁹/L | 0.2–1 | 0.2–0.6 |  |  |
| Eosinophils | ×10⁹/L | 0–0.5 | 0–0.3 |  |  |
| Basophils | ×10⁹/L | 0–0.1 | 0–0.1 |  |  |
| Neutrophil/Lymphocyte Ratio | ratio | 0.7–3.5 | 0.7–2.5 |  |  |
| ESR (Westergren) | mm/hr | 0–20 | 0–15 |  | M: lab 0–15, FM 0–10 |

### Electrolytes & Minerals

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| Sodium | mmol/L | 136–145 | 137–143 | < 125 or > 155 |  |
| Potassium | mmol/L | 3.5–5.1 | 4–4.8 | < 3 or > 6 |  |
| Chloride | mmol/L | 98–107 | 100–106 |  |  |
| Bicarbonate | mmol/L | 22–29 | 24–28 |  |  |
| Anion Gap | mmol/L | 7–16 | 6–14 |  |  |
| Calcium | mmol/L | 2.15–2.55 | 2.25–2.45 | < 1.9 or > 2.9 |  |
| Ca/Phos. Ratio | ratio | 1.5–2.5 | 1.8–2.5 |  |  |
| Na/K Ratio | ratio | 27–40 | 30–40 |  |  |
| RBC Magnesium | mmol/L | 1.65–2.65 | 1.8–2.5 |  |  |
| Magnesium (Serum) | mmol/L | 0.66–1.07 | 0.8–1 | < 0.5 |  |
| Phosphate | mmol/L | 0.74–1.52 | 0.9–1.3 |  |  |

### Vitamins & Micronutrients

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| Vitamin D (25-OH) | ng/mL | 30–100 | 40–80 | < 10 |  |
| Serum Iron | µmol/L | 9–30.4 | 12–25 |  |  |
| Transferrin | µmol/L | 24–45 | 26–42 |  |  |
| TIBC | µmol/L | 45–72 | 50–65 |  |  |
| Transferrin Saturation | % | 20–50 | 25–45 | > 60 |  |
| Ferritin | ng/mL | 20–300 | 50–200 | > 1000 | F: lab 13–150, FM 50–120 |
| Serum Zinc | µmol/L | 10.7–18.4 | 14–18 |  |  |

### Inflammation & Bone Metabolism

| Marker | Unit | Lab range | FM optimal | Action value | Sex-specific |
|---|---|---|---|---|---|
| hs-CRP | mg/L | 0–3 | 0–1 | > 10 |  |
| PTH | pg/mL | 15–65 | 15–45 |  |  |
| Creatine Kinase | IU/L | 26–140 | 26–90 |  |  |
