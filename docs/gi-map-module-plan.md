# Plan: GI-MAP stool testing in the Functional Health Analysis

Status: Phase 1 (capture) built; Phases 2 and 3 to come.

## Goal

Let a clinician add a patient's GI-MAP stool results to their FM lab
analysis, see them alongside the blood results, and have them:

- strengthen the gut and inflammation picture, which blood can barely see;
- appear in the Functional Health Analysis report and on the Digital Twin's
  gut hotspot;

all without changing how blood markers are scored.

## Principles

1. **Stool is a companion, not more blood markers.** Stool results have their
   own catalogue, units (genome equivalents per gram, µg/g, U/L) and statuses.
   They never get an FM optimal range they don't have, and never enter the
   blood panel scores or the five-band bars.
2. **Read as the lab reads it.** The status comes from the GI-MAP printed
   reference: within range, high, low, detected or not detected. There is no
   invented optimal.
3. **Evidence, not treatment.** Pathogens and H. pylori are flagged for the
   clinician. The report never suggests antibiotics or antimicrobials on its
   own.
4. **Children are first-class.** The first real case is a 4-year-old. Stool
   references are lab-printed and broadly age-independent, but wording and
   plans follow the existing child rules (`isChild`, `CHILD_SUPPLEMENT_NOTE`).

## What the GI-MAP gives us

| Section | Examples | How we'd treat it |
|---|---|---|
| Pathogens (bacterial, parasitic, viral) | C. difficile toxin A/B, Salmonella, Giardia, Norovirus | Detected / not detected, with the value. Any detection is flagged for review. |
| H. pylori and virulence factors, resistance genes | H. pylori 1.02e2, virulence factors cagA and vacA | Value against threshold. Virulence and resistance genes are shown only if H. pylori is positive. |
| Commensal / keystone bacteria and phyla | Akkermansia, Faecalibacterium, Bacteroidetes, F:B ratio | Low / in range / high against the printed range, shown on a log scale. |
| Opportunistic / overgrowth | Klebsiella, Proteus, Morganella, Staph aureus, Streptococcus | High if over threshold. |
| Fungi / yeast, parasites, worms, viruses | Candida, Blastocystis, Ascaris, EBV | Detected / not detected. |
| Intestinal health markers | Elastase-1, steatocrit, β-glucuronidase, occult blood, sIgA, anti-gliadin IgA, EDN, calprotectin, zonulin | Numeric against the printed range. These carry most of the clinical weight. |

## Plan, in phases

### Phase 1: capture (data and entry)

- **Catalogue**: a new `lib/stoolMarkers.ts`, modelled on `FM_BIOMARKERS`. Each
  marker has:
  - an id, name and aliases;
  - its section (pathogen, H. pylori, commensal, overgrowth, fungi, parasite,
    virus, intestinal);
  - its unit and kind: `quantitative` (a numeric range, possibly log-scale),
    `threshold` (`< x`) or `presence` (detected or not);
  - a default reference, as printed on the GI-MAP.

  About 90 markers, taken from the report's own section lists.
- **Storage**: a new nullable `stool` jsonb column on `fm_lab_analyses`
  (migration 0xx). It holds
  `{ lab: 'GI-MAP', collectedAt, accession, entries: StoolEntry[] }`. It is
  validated in the API, as `cleanEntries` already does for blood. One analysis
  equals one blood round plus at most one stool test.
- **Import**: reuse the upload / paste path. A second extraction prompt in
  `lib/fmAnalysisAi.ts`:
  - lists the stool catalogue;
  - keeps non-numeric results ("<dl", "Not Detected", "N/A"); the blood prompt
    drops these;
  - reads scientific notation (2.10e7).

  The same provider chain is used (Gemini, then Claude, then OpenAI).
  Unmatched rows are kept under "Other stool markers", as blood does.
- **From the EMR**: GI-MAP PDFs already land as `laboratory` documents, so the
  existing "read from record" flow can offer them to the stool import.
- **UI**: a "Stool test" card on the Results step, below the blood table. It
  has an import button, a table grouped by section, and editable values and
  references. No new workflow step.

### Phase 2: analysis (scoring and dashboard)

- **Gut findings**: a small rules file, `lib/stoolAssessment.ts`, turns stool
  entries into a handful of findings. Each has a status (flag / watch /
  clear), the markers behind it, and plain-language text. Proposed findings:

  | Finding | Driven by |
  |---|---|
  | Pathogen detected | any pathogen over threshold (flag; "review with clinician") |
  | H. pylori | H. pylori positive; virulence factors raise it to flag |
  | Low beneficial bacteria | Akkermansia, Faecalibacterium, Bifidobacterium, Lactobacillus low; Bacteroidetes low |
  | Overgrowth / dysbiosis | count of overgrowth and inflammatory bacteria high |
  | Yeast or parasites | any fungi / parasite detected |
  | Digestion and absorption | elastase low (pancreatic output), steatocrit high (fat malabsorption) |
  | Gut immune response | sIgA high or low, EDN high |
  | Gut inflammation | calprotectin high (flag over 2× the limit), occult blood |
  | Gut barrier | zonulin high, anti-gliadin IgA high |

- **Linking to the existing areas.** Stool doesn't change the blood formula. A
  stool finding can add evidence to an area: Digestive Function, Inflammation,
  Protein & Digestion, and Immune Resilience.

  **Decided: option A.** Stool findings show beside the area. The area's
  displayed status takes the higher of its blood score and the stool finding,
  labelled with the source ("from stool: calprotectin ↑"). The blood score
  itself never changes, so blood scores stay reproducible and explainable.
  Rejected: adding stool rules into the area's own score.
- **Dashboard**: a "Gut" panel on the analysis step:
  - finding chips;
  - a log-scale chart of commensals against their ranges (the same
    RangeIndicator, log mode);
  - a pathogen strip that is green when clear and lists detections;
  - gut markers as range indicators.

  The Systems View "Digestive Function" card and the Twin gut hotspot pick up
  the stool status.

### Phase 3: report

- **A new report part**, "Your Gut", built with the existing `add`, `divider`
  and `flow`:
  - **Gut at a glance**: finding cards and a pathogen summary.
  - **Your microbiome**: the commensal and phyla chart.
  - **Digestion, immunity, inflammation and barrier**: range bars for the
    intestinal health markers.
  - **Detected organisms**: what each one is and why it matters. This includes
    the "discuss with your clinician" wording for pathogens and H. pylori.
- **The Digital Twin page**: the gut hotspot and the Digestive callout use the
  combined blood and stool status, naming the stool markers.
- **Focus areas**: gut-related plans pull in stool evidence. "Consider testing:
  stool test" is dropped when one exists.
- **AI interpretation**: the stool summary is added to the `interpret` prompt
  context.

## Decisions needed

1. **Scope of the first release**: is GI-MAP only (Diagnostic Solutions)
   right? Do you also see Genova GI Effects or Doctor's Data stool tests?
   (These change the catalogue, not the design.)
2. ~~**Linking to areas**~~: decided, option A (shown beside the score; the
   area takes the higher status, labelled with its source).
3. **Who signs off clinical wording**: the per-finding text and the
   pathogen / H. pylori guidance need a clinician's review before going live.
4. **Children**: should stool findings in under-5s carry an extra note? For
   example, C. difficile colonisation is common in young children without
   disease.
5. **Test data**: we need one or two de-identified GI-MAP reports to build and
   test the import. Patient reports shouldn't be used in development.

## Out of scope for now

- Organic acids (KBMO / OAT). Phase 2 of the wider plan; it reuses the same
  companion-module pattern.
- Food sensitivity (IgG). Last, with clear "reactivity, not allergy" framing.
- Trends across repeat stool tests.

## Rough size

- **Phase 1**: about 2–3 days (catalogue, migration, import prompt, entry UI).
- **Phase 2**: about 2 days (assessment rules, dashboard panel, Twin / Systems
  link).
- **Phase 3**: about 2 days (report part, AI context), plus clinical wording
  review.

Each phase ships as its own PR.
