// Phenotypic Age (PhenoAge): a biological age worked out from nine routine
// blood results and chronological age.
//
// Levine ME et al. An epigenetic biomarker of aging for lifespan and
// healthspan. Aging (Albany NY) 2018;10(4):573-591. Validated in Liu Z et al.,
// PLoS Med 2018;15(12):e1002718. Coefficients as in the BioAge R package
// (Kwon & Belsky 2021), the usual reference implementation.
//
// The model was fitted to 10-year mortality in NHANES III and checked against
// NHANES IV. It ranks risk well; it has not been shown that lowering the score
// lowers that risk, so the report presents it as a risk indicator.
//
// This file has no imports so the tests can run it directly under Node.

/** Each input in the units the model was fitted in. */
export type PhenoAgeInputs = {
  /** Years. */
  age: number
  /** g/L */
  albumin: number
  /** µmol/L */
  creatinine: number
  /** mmol/L, fasting */
  glucose: number
  /** mg/L (as labs report hs-CRP); converted to mg/dL for the model. */
  crp: number
  /** % of white cells */
  lymphocytePct: number
  /** fL */
  mcv: number
  /** % */
  rdw: number
  /** U/L */
  alp: number
  /** ×10⁹/L (the same number as ×10³/µL) */
  wbc: number
}

export type PhenoAgeMarker = Exclude<keyof PhenoAgeInputs, 'age'>

export const PHENOAGE_MARKERS: Array<{ key: PhenoAgeMarker; name: string }> = [
  { key: 'albumin', name: 'Albumin' },
  { key: 'creatinine', name: 'Creatinine' },
  { key: 'glucose', name: 'Fasting Glucose' },
  { key: 'crp', name: 'hs-CRP' },
  { key: 'lymphocytePct', name: 'Lymphocytes (%)' },
  { key: 'mcv', name: 'MCV' },
  { key: 'rdw', name: 'RDW' },
  { key: 'alp', name: 'Alk. Phosphatase' },
  { key: 'wbc', name: 'WBC Count' },
]

const INTERCEPT = -19.9067
const WEIGHTS: Record<PhenoAgeMarker | 'age', number> = {
  albumin: -0.0336,
  creatinine: 0.0095,
  glucose: 0.1953,
  crp: 0.0954, // on ln(CRP in mg/dL)
  lymphocytePct: -0.012,
  mcv: 0.0268,
  rdw: 0.3306,
  alp: 0.00188,
  wbc: 0.0554,
  age: 0.0804,
}
/** Gompertz shape from the mortality model. */
const GAMMA = 0.0076927
/** CRP below the assay's floor would send ln(CRP) to minus infinity. */
const CRP_FLOOR_MG_L = 0.1

/** The age range the model was fitted and validated on. */
export const PHENOAGE_MIN_AGE = 20
export const PHENOAGE_MAX_AGE = 84

export type PhenoAgeResult = {
  phenoAge: number
  chronologicalAge: number
  /** PhenoAge minus chronological age: negative is younger than expected. */
  gap: number
  /** The model's 10-year mortality risk, 0–1. */
  mortality10y: number
}

export function phenoAge(inputs: PhenoAgeInputs): PhenoAgeResult {
  const crpMgDl = Math.max(inputs.crp, CRP_FLOOR_MG_L) / 10
  const xb = INTERCEPT
    + WEIGHTS.albumin * inputs.albumin
    + WEIGHTS.creatinine * inputs.creatinine
    + WEIGHTS.glucose * inputs.glucose
    + WEIGHTS.crp * Math.log(crpMgDl)
    + WEIGHTS.lymphocytePct * inputs.lymphocytePct
    + WEIGHTS.mcv * inputs.mcv
    + WEIGHTS.rdw * inputs.rdw
    + WEIGHTS.alp * inputs.alp
    + WEIGHTS.wbc * inputs.wbc
    + WEIGHTS.age * inputs.age
  const mortality = 1 - Math.exp(-Math.exp(xb) * (Math.exp(120 * GAMMA) - 1) / GAMMA)
  const age = 141.50225 + Math.log(-0.00553 * Math.log(1 - mortality)) / 0.090165
  return { phenoAge: age, chronologicalAge: inputs.age, gap: age - inputs.age, mortality10y: mortality }
}

/** Reasons a result should be read with care, from the inputs alone. */
export function phenoAgeCautions(inputs: PhenoAgeInputs): string[] {
  const cautions: string[] = []
  if (inputs.crp > 10) cautions.push('hs-CRP is above 10 mg/L, which usually means an acute infection or injury; this raises PhenoAge temporarily. Repeat when well.')
  if (inputs.wbc < 3 || inputs.wbc > 11) cautions.push('The white cell count is outside the usual range, which can reflect a passing illness; repeat when well.')
  if (inputs.age < PHENOAGE_MIN_AGE || inputs.age > PHENOAGE_MAX_AGE) cautions.push(`PhenoAge was validated in adults aged ${PHENOAGE_MIN_AGE}–${PHENOAGE_MAX_AGE}.`)
  return cautions
}
