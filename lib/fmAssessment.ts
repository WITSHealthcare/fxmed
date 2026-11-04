// The Functional Health Report's algorithmic assessment. From the entered
// results it works out:
//   - calculated markers (HOMA-IR, TG/HDL, AST/ALT, globulin, anion gap…)
//   - where each result sits: alarm, outside the lab range, outside optimal, optimal
//   - a likelihood of dysfunction for each body system, accessory system,
//     nutrient status and individual nutrient need, with the markers behind it
//   - the health improvement areas that need attention, each with a standard
//     plan (nutrition, lifestyle, supplements to discuss, follow-up tests)
//
// All of it is deterministic, so the report is complete without the AI; the
// AI and the clinician can then personalise the wording and the plan.

import {
  canonicalValue, createEntry, markerById, summarize,
  type AreaPlan, type AssessedEntry, type FmEntry, type FmNarrative, type Priority, type Sex,
} from './fmBiomarkers'
import { markerExplanation } from './fmMarkerInfo'

// ---------------------------------------------------------------------------
// Where a result sits

export type Band = 'alarm_low' | 'below_standard' | 'below_optimal' | 'optimal' | 'above_optimal' | 'above_standard' | 'alarm_high' | 'unknown'

export const BANDS: Band[] = ['alarm_low', 'below_standard', 'below_optimal', 'optimal', 'above_optimal', 'above_standard', 'alarm_high']

export const BAND_LABEL: Record<Band, string> = {
  alarm_low: 'Alarm Low', below_standard: 'Below Standard', below_optimal: 'Below Optimal', optimal: 'Optimal',
  above_optimal: 'Above Optimal', above_standard: 'Above Standard', alarm_high: 'Alarm High', unknown: 'Not assessed',
}

export const BAND_COLOR: Record<Band, string> = {
  alarm_low: '#B8326A', below_standard: '#E0674F', below_optimal: '#E9A93B', optimal: '#52B788',
  above_optimal: '#E9A93B', above_standard: '#E0674F', alarm_high: '#B8326A', unknown: '#A9B5AD',
}

/** Which side of the optimal range a borderline result leans towards. */
function lean(entry: AssessedEntry): 'low' | 'high' | null {
  const range = entry.fmRangeParsed
  if (entry.numeric === null || !range) return null
  if (range.low === null || range.low === 0) return 'high'
  if (range.high === null) return 'low'
  return entry.numeric < (range.low + range.high) / 2 ? 'low' : 'high'
}

export function bandOf(entry: AssessedEntry): Band {
  if (entry.numeric === null || (entry.lab === 'unknown' && entry.fm === 'unknown')) return 'unknown'
  const low = entry.lab === 'low' || entry.fm === 'low'
  if (entry.urgent) return low || (!(entry.lab === 'high' || entry.fm === 'high') && lean(entry) === 'low') ? 'alarm_low' : 'alarm_high'
  // Where the FM range deliberately extends past the lab's (a high HDL), the FM judgement stands.
  if (entry.fm === 'low') return entry.lab === 'low' ? 'below_standard' : 'below_optimal'
  if (entry.fm === 'high') return entry.lab === 'high' ? 'above_standard' : 'above_optimal'
  if (entry.fm === 'unknown' && entry.lab === 'low') return 'below_standard'
  if (entry.fm === 'unknown' && entry.lab === 'high') return 'above_standard'
  return 'optimal'
}

const isLowBand = (band: Band) => band === 'alarm_low' || band === 'below_standard' || band === 'below_optimal'
const isHighBand = (band: Band) => band === 'alarm_high' || band === 'above_standard' || band === 'above_optimal'

/** The direction a result is out of optimal in, if it is. */
export function directionOf(entry: AssessedEntry): 'low' | 'high' | null {
  const band = bandOf(entry)
  return isLowBand(band) ? 'low' : isHighBand(band) ? 'high' : null
}

// ---------------------------------------------------------------------------
// Calculated markers

const fixed = (value: number) => String(Number(value.toFixed(value >= 10 ? 1 : 2)))

/**
 * Ratios and differences the report uses that labs often leave out. Each is
 * added only when the lab has not reported it and both inputs are in units
 * that can be converted to the catalogue's.
 */
export function withCalculated(entries: FmEntry[], sex: Sex): FmEntry[] {
  const present = new Set(entries.filter(entry => entry.value.trim()).map(entry => entry.markerId).filter(Boolean))
  const value = (id: string) => {
    const entry = entries.find(item => item.markerId === id && item.value.trim())
    return entry ? canonicalValue(entry) : null
  }
  const extra: FmEntry[] = []
  const add = (id: string, from: string[], compute: (values: number[]) => number | null) => {
    if (present.has(id)) return
    const values = from.map(value)
    if (values.some(item => item === null)) return
    const result = compute(values as number[])
    if (result === null || !Number.isFinite(result)) return
    const marker = markerById(id)
    if (!marker) return
    const names = from.map(input => markerById(input)?.name || input)
    extra.push({ ...createEntry(marker, sex, { value: fixed(result) }), note: `Calculated from ${names.join(' and ')}.`, calculated: true })
  }
  const ratio = ([a, b]: number[]) => b ? a / b : null
  add('homa_ir', ['fasting_glucose', 'fasting_insulin'], ([glucose, insulin]) => (glucose * insulin) / 22.5)
  add('tg_hdl_ratio', ['triglycerides', 'hdl'], ratio)
  add('chol_hdl_ratio', ['total_cholesterol', 'hdl'], ratio)
  add('non_hdl', ['total_cholesterol', 'hdl'], ([total, hdl]) => total - hdl)
  add('ast_alt_ratio', ['ast', 'alt'], ratio)
  add('na_k_ratio', ['sodium', 'potassium'], ratio)
  add('nlr', ['neutrophils', 'lymphocytes'], ratio)
  add('globulin', ['total_protein', 'albumin'], ([total, albumin]) => total - albumin)
  add('anion_gap', ['sodium', 'chloride', 'bicarbonate'], ([sodium, chloride, bicarbonate]) => sodium - chloride - bicarbonate)
  return extra.length ? [...entries, ...extra] : entries
}

// ---------------------------------------------------------------------------
// Assessment areas

export type AreaGroup = 'system' | 'accessory' | 'nutrient' | 'deficiency' | 'plan'

type Rule = { id: string; dir: 'high' | 'low' | 'any'; weight: number; sex?: 'female' | 'male' }

export type Area = {
  id: string
  group: AreaGroup
  name: string
  /** What the area is, for the details pages. */
  about: string
  rules: Rule[]
  /** Tests that would sharpen this area when not done: catalogue ids or test names. */
  consider?: string[]
  sex?: 'female' | 'male'
  /** Health improvement areas only: the finding and the standard plan. */
  finding?: string
  plan?: AreaPlan
}

const r = (id: string, dir: Rule['dir'], weight = 1, sex?: Rule['sex']): Rule => ({ id, dir, weight, sex })

export const AREA_GROUPS: Record<AreaGroup, { title: string; intro: string }> = {
  system: {
    title: 'Functional Body Systems',
    intro: 'Each body system below is scored from the biomarkers that reflect how well it is working. The percentage is the likelihood of dysfunction suggested by your results: the higher it is, the more your results point to that system needing support.',
  },
  accessory: {
    title: 'Accessory Systems',
    intro: 'Accessory systems are processes that run across the whole body, such as fat transport, inflammation and acid–base balance. They are scored in the same way as the body systems.',
  },
  nutrient: {
    title: 'Nutrient Status',
    intro: 'Nutrient status reflects what you eat and also how well you digest, absorb, transport and use nutrients. These scores show where your overall nutrition may be falling short.',
  },
  deficiency: {
    title: 'Individual Nutrient Needs',
    intro: 'These scores show the likelihood that you need more of an individual nutrient, based on your blood results. Your clinician will weigh them against your diet, symptoms and medicines before recommending any supplement.',
  },
  plan: {
    title: 'Health Improvement Plan',
    intro: 'The health improvement plan brings together everything in this report and focuses on the areas that need the most attention, with a practical plan for each.',
  },
}

const BLOOD_SUGAR: Rule[] = [r('fasting_insulin', 'high', 3), r('homa_ir', 'high', 3), r('hba1c', 'high', 3), r('hba1c_ifcc', 'high', 3), r('fasting_glucose', 'any', 2), r('tg_hdl_ratio', 'high', 2), r('c_peptide', 'high', 1), r('triglycerides', 'high', 1), r('glucose_insulin_ratio', 'low', 1), r('quicki', 'low', 1)]
const CARDIO: Rule[] = [r('apob', 'high', 3), r('ldl', 'high', 2), r('lpa', 'high', 2), r('non_hdl', 'high', 2), r('hdl', 'low', 2), r('chol_hdl_ratio', 'high', 2), r('tg_hdl_ratio', 'high', 2), r('homocysteine', 'high', 2), r('hs_crp', 'high', 2), r('apoa1', 'low', 1), r('total_cholesterol', 'high', 1), r('triglycerides', 'high', 1), r('hba1c', 'high', 1), r('fasting_insulin', 'high', 1), r('vitamin_d', 'low', 1), r('ferritin', 'high', 1)]
const LIPIDS: Rule[] = [r('ldl', 'high', 3), r('apob', 'high', 3), r('total_cholesterol', 'high', 2), r('non_hdl', 'high', 2), r('triglycerides', 'high', 2), r('hdl', 'low', 2), r('chol_hdl_ratio', 'high', 1), r('tg_hdl_ratio', 'high', 1)]
const THYROID: Rule[] = [r('tsh', 'any', 3), r('free_t4', 'any', 2), r('free_t3', 'any', 2), r('reverse_t3', 'high', 1), r('anti_tpo', 'high', 2), r('anti_tg', 'high', 2)]
const ADRENAL: Rule[] = [r('cortisol_am', 'any', 3), r('cortisol_pm', 'any', 2), r('dhea_s', 'low', 2), r('na_k_ratio', 'any', 1), r('sodium', 'any', 1), r('potassium', 'any', 1)]
const SEX_HORMONES: Rule[] = [
  r('estradiol', 'any', 2, 'female'), r('progesterone', 'low', 2, 'female'), r('testosterone', 'any', 2, 'female'), r('free_testosterone', 'any', 2, 'female'), r('free_testosterone_index', 'high', 2, 'female'), r('shbg', 'any', 1, 'female'), r('dhea_s', 'any', 1, 'female'),
  r('testosterone', 'low', 3, 'male'), r('free_testosterone', 'low', 3, 'male'), r('free_testosterone_index', 'low', 2, 'male'), r('estradiol', 'high', 2, 'male'), r('shbg', 'any', 1, 'male'), r('dhea_s', 'low', 1, 'male'),
]
const LIVER: Rule[] = [r('alt', 'high', 3), r('ggt', 'high', 3), r('ast', 'high', 2), r('alp', 'high', 1), r('bilirubin_total', 'high', 1), r('albumin', 'low', 2), r('total_protein', 'low', 1), r('ast_alt_ratio', 'high', 1), r('ldh', 'high', 1)]
const KIDNEY: Rule[] = [r('egfr', 'low', 3), r('creatinine', 'high', 2), r('protein_creatinine', 'high', 3), r('u_protein', 'high', 2), r('urea', 'high', 1), r('uric_acid', 'high', 1), r('potassium', 'high', 1), r('phosphate', 'high', 1)]
const RED_CELLS: Rule[] = [r('hemoglobin', 'any', 3), r('hematocrit', 'any', 1), r('rbc', 'any', 1), r('mcv', 'any', 2), r('mch', 'any', 1), r('mchc', 'low', 1), r('rdw', 'high', 2)]
const IMMUNE: Rule[] = [r('wbc', 'any', 2), r('lymphocytes', 'any', 2), r('neutrophils', 'any', 1), r('nlr', 'any', 1), r('monocytes', 'high', 1), r('eosinophils', 'high', 2), r('globulin', 'any', 1)]
const BONE: Rule[] = [r('calcium', 'any', 3), r('pth', 'high', 3), r('vitamin_d', 'low', 2), r('phosphate', 'any', 1), r('alp', 'any', 1), r('magnesium', 'low', 1)]
const INFLAMMATION: Rule[] = [r('hs_crp', 'high', 3), r('esr', 'high', 2), r('ferritin', 'high', 1), r('homocysteine', 'high', 1), r('nlr', 'high', 1), r('wbc', 'high', 1), r('globulin', 'high', 1), r('platelets', 'high', 1)]
const METHYLATION: Rule[] = [r('homocysteine', 'high', 3), r('b12', 'low', 3), r('folate', 'low', 3), r('mcv', 'high', 1), r('rdw', 'high', 1)]
const IRON_LOW: Rule[] = [r('ferritin', 'low', 3), r('hemoglobin', 'low', 3), r('tsat', 'low', 2), r('mcv', 'low', 2), r('serum_iron', 'low', 1), r('mch', 'low', 1), r('rdw', 'high', 1), r('tibc', 'high', 1), r('transferrin', 'high', 1), r('hematocrit', 'low', 1)]
const MINERALS: Rule[] = [r('rbc_magnesium', 'low', 3), r('magnesium', 'low', 3), r('zinc', 'low', 3), r('alp', 'low', 1), r('potassium', 'low', 1), r('calcium', 'low', 1), r('phosphate', 'low', 1)]
const PROTEIN: Rule[] = [r('total_protein', 'low', 3), r('albumin', 'low', 3), r('globulin', 'low', 1), r('urea', 'low', 2)]

export const AREAS: Area[] = [
  // Functional body systems
  { id: 'blood_sugar', group: 'system', name: 'Blood Sugar Regulation', rules: BLOOD_SUGAR, consider: ['fasting_insulin', 'hba1c'],
    about: 'This score shows how well your body is controlling blood sugar. Problems develop slowly, often with insulin rising for years before glucose does, so these markers can show a trend towards insulin resistance, pre-diabetes or low blood sugar long before diabetes is diagnosed.' },
  { id: 'cardiovascular', group: 'system', name: 'Cardiovascular Risk', rules: CARDIO, consider: ['apob', 'lpa', 'hs_crp', 'homocysteine'],
    about: 'This score combines the blood markers that predict heart and blood vessel disease: blood fats and the particles that carry them, inflammation, homocysteine and blood sugar. It is read alongside your blood pressure, weight, family history and lifestyle.' },
  { id: 'thyroid', group: 'system', name: 'Thyroid Function', rules: THYROID, consider: ['free_t3', 'free_t4', 'anti_tpo'],
    about: 'The thyroid sets the pace of metabolism in every cell. This score looks at thyroid hormone production, its conversion to the active form, and signs of the immune system attacking the thyroid.' },
  { id: 'adrenal', group: 'system', name: 'Adrenal Function', rules: ADRENAL, consider: ['cortisol_am', 'dhea_s'],
    about: 'The adrenal glands make the hormones that respond to stress, keep blood pressure and blood sugar steady, and supply the raw material for sex hormones. Long-term stress can push them to over- or under-produce.' },
  { id: 'sex_hormones', group: 'system', name: 'Sex Hormone Function', rules: SEX_HORMONES, consider: ['testosterone', 'shbg', 'estradiol'],
    about: 'Sex hormones affect energy, mood, libido, muscle, bone and metabolism in both men and women. This score shows whether your levels, and the protein that carries them, are in the range that supports good health.' },
  { id: 'liver', group: 'system', name: 'Liver Function', rules: LIVER, consider: ['ggt', 'albumin'],
    about: 'The liver processes nutrients, makes proteins, clears hormones and toxins, and stores energy. This score looks at enzymes that leak from stressed liver cells and at the proteins the liver makes.' },
  { id: 'gallbladder', group: 'system', name: 'Gallbladder Function', rules: [r('bilirubin_conj', 'high', 3), r('ggt', 'high', 2), r('alp', 'high', 2), r('bilirubin_total', 'high', 1), r('total_cholesterol', 'high', 1), r('triglycerides', 'high', 1)], consider: ['ggt', 'bilirubin_conj'],
    about: 'The gallbladder stores bile and releases it to digest fats. Bile also carries cholesterol and processed toxins out of the body, so sluggish bile flow affects digestion, cholesterol and detoxification.' },
  { id: 'kidney', group: 'system', name: 'Kidney Function', rules: KIDNEY, consider: ['egfr', 'protein_creatinine'],
    about: 'The kidneys filter waste from the blood and balance fluid, minerals and blood pressure. This score looks at how well they filter and whether protein is leaking through them.' },
  { id: 'red_blood', group: 'system', name: 'Red Blood Cell Function', rules: RED_CELLS, consider: ['ferritin'],
    about: 'Red blood cells carry oxygen to every tissue. This score looks at how many there are, their size and haemoglobin content, which can point to iron, B12 or folate shortfalls.' },
  { id: 'immune', group: 'system', name: 'Immune Function', rules: IMMUNE, consider: ['neutrophils', 'lymphocytes'],
    about: 'White blood cells and globulins are the immune system\'s front line. This score shows whether they suggest an immune system that is depleted, or one that is working hard against infection, allergy or inflammation.' },
  { id: 'digestion', group: 'system', name: 'Digestive Function', rules: [r('total_protein', 'low', 2), r('albumin', 'low', 2), r('globulin', 'any', 1), r('urea', 'low', 1), r('b12', 'low', 1), r('ferritin', 'low', 1), r('eosinophils', 'high', 2), r('chloride', 'low', 1)],
    about: 'Good digestion breaks down and absorbs protein, minerals and vitamins. Low protein, B12 or iron, alongside signs such as raised eosinophils, can suggest low stomach acid, poor absorption or gut parasites.' },
  { id: 'bone', group: 'system', name: 'Bone Health', rules: BONE, consider: ['vitamin_d', 'pth'],
    about: 'Bone strength depends on calcium, phosphate, vitamin D and parathyroid hormone staying in balance. This score shows whether that balance is under strain.' },

  // Accessory systems
  { id: 'lipids', group: 'accessory', name: 'Lipid Balance', rules: LIPIDS,
    about: 'This score shows the level of cholesterol and fat in your blood. A raised score means higher than optimal blood fats (dyslipidaemia), which can be genetic or come from diet, hormone imbalance or blood sugar problems.' },
  { id: 'inflammation', group: 'accessory', name: 'Inflammation', rules: INFLAMMATION, consider: ['hs_crp'],
    about: 'Inflammation is the body\'s response to injury and infection. When it smoulders at a low level for months it damages blood vessels and tissues, and drives many chronic diseases.' },
  { id: 'oxidative', group: 'accessory', name: 'Oxidative Stress', rules: [r('ggt', 'high', 2), r('uric_acid', 'low', 1), r('bilirubin_total', 'low', 1), r('albumin', 'low', 1), r('homocysteine', 'high', 1), r('lymphocytes', 'low', 1), r('ferritin', 'high', 1)],
    about: 'Oxidative stress is damage from free radicals when the body\'s antioxidant defences are outpaced. Several routine blood markers double as antioxidants or as signs of that strain.' },
  { id: 'acid_base', group: 'accessory', name: 'Acid–Base Balance', rules: [r('bicarbonate', 'any', 3), r('anion_gap', 'high', 2), r('chloride', 'any', 1), r('potassium', 'any', 1)],
    about: 'The blood is kept within a narrow acid–base range by the lungs and kidneys. Shifts in bicarbonate, chloride and the anion gap show when that balance is being pushed.' },
  { id: 'methylation_status', group: 'accessory', name: 'Methylation', rules: METHYLATION, consider: ['homocysteine', 'b12', 'folate'],
    about: 'Methylation is a chemical process that runs throughout the body, needed for DNA, detoxification, mood chemicals and keeping homocysteine low. It depends on B12, folate and B6.' },

  // Nutrient status
  { id: 'vitamin_status', group: 'nutrient', name: 'Vitamin Status', rules: [r('vitamin_d', 'low', 3), r('b12', 'low', 2), r('folate', 'low', 2), r('homocysteine', 'high', 1), r('mcv', 'high', 1), r('alt', 'low', 1)], consider: ['vitamin_d', 'b12', 'folate'],
    about: 'This score is a general view of vitamin balance, reflecting diet, digestion and absorption, and how well vitamins are transported into the cells.' },
  { id: 'mineral_status', group: 'nutrient', name: 'Mineral Status', rules: MINERALS, consider: ['rbc_magnesium', 'zinc'],
    about: 'Minerals such as magnesium, zinc, calcium and potassium drive hundreds of enzymes. This score shows whether your mineral reserves look adequate.' },
  { id: 'iron_status', group: 'nutrient', name: 'Iron Status', rules: [...IRON_LOW, r('ferritin', 'high', 2), r('tsat', 'high', 2)], consider: ['ferritin', 'tsat'],
    about: 'Iron carries oxygen and powers energy production, but too much is damaging. This score looks at both depleted and overloaded iron stores.' },
  { id: 'protein_status', group: 'nutrient', name: 'Protein Status', rules: PROTEIN,
    about: 'Protein is needed for muscle, immunity, hormones and repair. This score reflects both protein intake and how well it is digested and absorbed.' },
  { id: 'hydration', group: 'nutrient', name: 'Hydration Status', rules: [r('sodium', 'high', 2), r('urea', 'high', 1), r('albumin', 'high', 1), r('total_protein', 'high', 1), r('hematocrit', 'high', 1), r('chloride', 'high', 1)],
    about: 'When you are short of fluid, the blood becomes more concentrated and several markers rise together. This score shows whether your results suggest dehydration.' },
  { id: 'electrolytes', group: 'nutrient', name: 'Electrolyte Status', rules: [r('sodium', 'any', 2), r('potassium', 'any', 2), r('chloride', 'any', 1), r('bicarbonate', 'any', 1), r('na_k_ratio', 'any', 1)],
    about: 'Electrolytes carry the electrical charge for nerves, muscles and the heart, and control fluid balance.' },

  // Individual nutrient needs
  { id: 'vitamin_d_need', group: 'deficiency', name: 'Vitamin D Need', rules: [r('vitamin_d', 'low', 3)], consider: ['vitamin_d'], about: 'Your results suggest your vitamin D level may be lower than optimal.' },
  { id: 'b12_need', group: 'deficiency', name: 'Vitamin B12 Need', rules: [r('b12', 'low', 3), r('mcv', 'high', 1), r('homocysteine', 'high', 1), r('rdw', 'high', 1)], consider: ['b12', 'Methylmalonic acid (MMA)'], about: 'Your results suggest your vitamin B12 level may be lower than optimal.' },
  { id: 'folate_need', group: 'deficiency', name: 'Folate Need', rules: [r('folate', 'low', 3), r('homocysteine', 'high', 1), r('mcv', 'high', 1)], consider: ['folate'], about: 'Your results suggest your folate level may be lower than optimal.' },
  { id: 'iron_need', group: 'deficiency', name: 'Iron Need', rules: IRON_LOW, consider: ['ferritin', 'tsat'], about: 'Your results suggest your iron stores may be lower than optimal.' },
  { id: 'magnesium_need', group: 'deficiency', name: 'Magnesium Need', rules: [r('rbc_magnesium', 'low', 3), r('magnesium', 'low', 3), r('potassium', 'low', 1), r('calcium', 'low', 1)], consider: ['rbc_magnesium'], about: 'Your results suggest your magnesium level may be lower than optimal.' },
  { id: 'zinc_need', group: 'deficiency', name: 'Zinc Need', rules: [r('zinc', 'low', 3), r('alp', 'low', 2)], consider: ['zinc'], about: 'Your results suggest your zinc level may be lower than optimal.' },
  { id: 'b6_need', group: 'deficiency', name: 'Vitamin B6 Need', rules: [r('alt', 'low', 2), r('ast', 'low', 1), r('homocysteine', 'high', 1)], about: 'Your results suggest your vitamin B6 level may be lower than optimal.' },
  { id: 'dhea_need', group: 'deficiency', name: 'DHEA Need', rules: [r('dhea_s', 'low', 3)], consider: ['dhea_s'], about: 'Your results suggest your DHEA level may be lower than optimal.' },
  { id: 'selenium_need', group: 'deficiency', name: 'Selenium Need', rules: [r('free_t3', 'low', 2), r('reverse_t3', 'high', 1), r('anti_tpo', 'high', 1)], consider: ['free_t3', 'Selenium (serum)'], about: 'Your results suggest your selenium level may be lower than optimal; selenium is needed to activate thyroid hormone.' },
  { id: 'thiamine_need', group: 'deficiency', name: 'Thiamine (B1) Need', rules: [r('anion_gap', 'high', 2), r('bicarbonate', 'low', 1)], about: 'Your results suggest your thiamine (vitamin B1) level may be lower than optimal.' },

  // Health improvement areas
  { id: 'insulin_resistance', group: 'plan', name: 'Insulin Resistance & Blood Sugar', rules: [...BLOOD_SUGAR.filter(rule => rule.id !== 'fasting_glucose'), r('fasting_glucose', 'high', 2), r('hdl', 'low', 1), r('shbg', 'low', 1), r('uric_acid', 'high', 1)],
    about: 'Insulin resistance means the body needs more insulin than it should to keep blood sugar steady.',
    finding: 'Your results show a pattern of insulin resistance: your body needs more insulin than it should to keep blood sugar steady. Left alone, this leads towards type 2 diabetes, fatty liver and heart disease, but it responds very well to changes in diet, movement and sleep.',
    plan: {
      nutrition: ['Build each meal around protein and non-starchy vegetables (ugu, efo, okra, garden egg, cabbage), and make starch the smallest part of the plate.', 'Swap white rice, white bread, garri and pounded yam for smaller portions of beans, ofada or brown rice, unripe plantain, oats or millet.', 'Cut out sugary drinks, malt drinks, fruit juice and pastries; drink water, unsweetened zobo or tea instead.', 'Eat whole fruit rather than juice, paired with a few groundnuts or other nuts.', 'Finish eating 3 hours before bed, for an overnight fast of about 12 hours.'],
      lifestyle: ['Walk for 10–15 minutes after your two largest meals, which lowers the after-meal sugar rise.', 'Do strength training 2–3 times a week: muscle is the body\'s largest store for blood sugar.', 'Sleep 7–8 hours; even one short night worsens insulin resistance.', 'If you carry weight around your middle, losing 5–7% of body weight greatly improves insulin sensitivity.'],
      supplements: ['Magnesium glycinate 200–400 mg in the evening.', 'Berberine 500 mg two to three times daily with meals (not in pregnancy, and only with your doctor\'s agreement if you take diabetes medicine).', 'Omega-3 fish oil (EPA + DHA) 1–2 g daily.', 'Myo-inositol 2–4 g daily, particularly for women with irregular cycles.'],
      tests: ['Repeat fasting glucose, insulin, HbA1c and lipids in 3 months.', 'Waist circumference and blood pressure at each visit.', 'Oral glucose tolerance test with insulin if results are borderline.'],
    } },
  { id: 'dyslipidaemia', group: 'plan', name: 'Raised Blood Fats', rules: LIPIDS,
    about: 'Dyslipidaemia means cholesterol and blood fats are outside their optimal ranges.',
    finding: 'Your cholesterol and blood fats are higher than optimal (dyslipidaemia), which over time increases the risk of plaque in the arteries. Diet, weight, thyroid function and blood sugar control all influence these numbers.',
    plan: {
      nutrition: ['Eat soluble fibre every day (oats, beans, okra, apples, psyllium husk), which binds cholesterol in the gut.', 'Eat oily fish such as mackerel (titus), sardines or salmon at least twice a week.', 'Cook with olive oil or a little unrefined palm oil; avoid margarine, fried snacks and reused frying oil.', 'Snack on a small handful of groundnuts, cashews, walnuts or tiger nuts.', 'Limit processed meat, pastries and sugar, which raise triglycerides.'],
      lifestyle: ['Aim for 150 minutes of brisk walking or other moderate exercise a week.', 'Stop smoking, which lowers protective HDL and damages artery walls.', 'Keep alcohol to no more than a few drinks a week.'],
      supplements: ['Omega-3 fish oil (EPA + DHA) 2 g daily if triglycerides are raised.', 'Psyllium husk 5–10 g daily in water.', 'Plant sterols 2 g daily with meals.', 'Red yeast rice or bergamot only under clinical supervision, and never with a statin.'],
      tests: ['Repeat a fasting lipid profile in 3 months.', 'ApoB and lipoprotein(a), if not measured; Lp(a) needs testing only once.', 'Thyroid function (TSH and free T4), as an underactive thyroid raises cholesterol.'],
    } },
  { id: 'cardiovascular_risk', group: 'plan', name: 'Cardiovascular Risk Reduction', rules: CARDIO, consider: ['apob', 'lpa', 'hs_crp', 'homocysteine'],
    about: 'Several markers that predict heart and blood vessel disease are outside their optimal ranges.',
    finding: 'Several markers that predict heart and blood vessel disease are outside their optimal ranges. Each one adds to risk and each can be changed, so improving them together brings the greatest benefit.',
    plan: {
      nutrition: ['Follow a Mediterranean-style pattern: vegetables, beans, whole grains, fish, nuts and olive oil at most meals.', 'Reduce salt, stock cubes and processed foods to help blood pressure.', 'Eat leafy greens and beetroot, whose nitrates help relax blood vessels.', 'Keep red and processed meat to once or twice a week.'],
      lifestyle: ['Check your blood pressure regularly, and have it treated if it stays above 130/80.', 'Build up to 150–300 minutes of moderate exercise a week.', 'Stop smoking: within a year the extra heart risk halves.', 'Make time each day to manage stress, through prayer, slow breathing or a walk outdoors.'],
      supplements: ['Omega-3 fish oil (EPA + DHA) 1–2 g daily.', 'Magnesium 200–400 mg daily.', 'CoQ10 100–200 mg daily, particularly if you take a statin.', 'Methylated B vitamins if homocysteine is raised.'],
      tests: ['Blood pressure, waist circumference and a resting ECG.', 'Repeat lipids, ApoB and hs-CRP in 3 months.', 'A 10-year cardiovascular risk score, and a coronary calcium scan where available if risk is intermediate.'],
    } },
  { id: 'hypothyroid', group: 'plan', name: 'Underactive Thyroid Pattern', rules: [r('tsh', 'high', 3), r('free_t3', 'low', 3), r('free_t4', 'low', 2), r('reverse_t3', 'high', 1)], consider: ['free_t3', 'free_t4', 'anti_tpo', 'reverse_t3'],
    about: 'Your thyroid may be underactive, or not converting its hormone into the active form efficiently.',
    finding: 'Your thyroid markers suggest the thyroid is underactive, or that its hormone is not being converted efficiently into the active form. This commonly causes tiredness, weight gain, feeling cold, constipation, hair thinning and low mood.',
    plan: {
      nutrition: ['Eat selenium-rich foods daily: two Brazil nuts, eggs, fish and sunflower seeds.', 'Get iodine from iodised salt, fish and seafood, but avoid high-dose kelp or iodine supplements unless advised.', 'Eat enough: very low-calorie diets slow the conversion of T4 to active T3.', 'Cook cruciferous vegetables (cabbage, broccoli) rather than eating large amounts raw.'],
      lifestyle: ['Protect sleep and manage stress; high cortisol blocks thyroid hormone activation.', 'If you take thyroid medicine, take it on an empty stomach, 4 hours apart from iron or calcium.', 'Keep a symptom diary to review with your clinician.'],
      supplements: ['Selenium 100–200 µg daily.', 'Zinc 15–30 mg daily with food.', 'Iron, only if ferritin is low.', 'Vitamin D3 to reach optimal levels.'],
      tests: ['Full thyroid panel (TSH, free T4, free T3, reverse T3, TPO and thyroglobulin antibodies) in 6–8 weeks.', 'Ferritin, vitamin D, B12 and zinc, which thyroid function depends on.', 'Thyroid ultrasound if antibodies are raised or a lump is felt.'],
    } },
  { id: 'thyroid_autoimmunity', group: 'plan', name: 'Thyroid Autoimmunity', rules: [r('anti_tpo', 'high', 3), r('anti_tg', 'high', 3)],
    about: 'Raised thyroid antibodies show the immune system is attacking the thyroid.',
    finding: 'Your thyroid antibodies are raised, which means the immune system is attacking the thyroid (autoimmune thyroiditis, or Hashimoto\'s). Hormone levels may still be normal; calming the immune response early can protect thyroid function.',
    plan: {
      nutrition: ['Try a strict 8–12 week gluten-free trial; gluten sensitivity is common with thyroid autoimmunity.', 'Follow an anti-inflammatory diet rich in vegetables, fish, olive oil, nuts and seeds.', 'Eat two Brazil nuts a day for selenium.', 'Limit sugar, alcohol and ultra-processed foods.'],
      lifestyle: ['Manage stress and protect sleep, both of which drive autoimmune activity.', 'Look after gut health; report constipation, bloating or reflux to your clinician.'],
      supplements: ['Selenium 200 µg daily, which can lower TPO antibodies.', 'Vitamin D3 to keep 25-OH vitamin D between 50 and 80 ng/mL.', 'Omega-3 fish oil 1–2 g daily.', 'Myo-inositol 600 mg with selenium has supporting evidence.'],
      tests: ['Repeat TPO and thyroglobulin antibodies with TSH, free T4 and free T3 in 3–6 months.', 'Coeliac screen (tTG-IgA with total IgA).', 'Thyroid ultrasound.'],
    } },
  { id: 'hyperthyroid', group: 'plan', name: 'Overactive Thyroid Pattern', rules: [r('tsh', 'low', 3), r('free_t4', 'high', 3), r('free_t3', 'high', 3)],
    about: 'Your thyroid may be overactive.',
    finding: 'Your thyroid markers suggest the thyroid may be overactive. This can cause a racing heart, anxiety, weight loss, heat intolerance and poor sleep, and should be reviewed by your doctor.',
    plan: {
      nutrition: ['Eat regular, protein-rich meals to meet raised energy needs.', 'Avoid iodine supplements, kelp and high-dose seaweed.', 'Limit caffeine, which worsens palpitations and anxiety.'],
      lifestyle: ['Report palpitations, tremor or unexplained weight loss to your doctor promptly.', 'Protect your bones with weight-bearing exercise.'],
      supplements: ['Avoid thyroid "support" products containing iodine or thyroid glandulars.', 'Calcium and vitamin D for bone protection, as advised by your clinician.'],
      tests: ['Repeat TSH, free T4 and free T3, with TSH receptor antibodies.', 'Referral to an endocrinologist if confirmed.'],
    } },
  { id: 'adrenal_stress', group: 'plan', name: 'Stress & Adrenal Resilience', rules: ADRENAL, consider: ['cortisol_am', 'dhea_s', 'cortisol_pm'],
    about: 'Your stress hormone markers suggest the adrenal glands are under strain.',
    finding: 'Your stress-hormone markers suggest your adrenal glands are working under strain. Over time this disturbs sleep, energy, blood sugar, immunity and hormone balance.',
    plan: {
      nutrition: ['Eat a breakfast with protein within an hour of waking, and avoid long gaps between meals.', 'Limit caffeine to one cup before midday.', 'Include potassium- and vitamin C-rich foods: vegetables, oranges, guava, pawpaw, avocado and coconut water.'],
      lifestyle: ['Keep regular sleep and wake times, with 7–9 hours in bed.', 'Get morning daylight, and avoid screens for an hour before bed.', 'Practise a daily stress-reducing habit, such as slow breathing, prayer, meditation or a walk.', 'Favour moderate exercise over exhausting high-intensity training until your energy recovers.'],
      supplements: ['Magnesium glycinate 200–400 mg in the evening.', 'Vitamin C 500–1,000 mg daily.', 'A B-complex in the morning.', 'Ashwagandha 300–600 mg daily (not in pregnancy or with an overactive thyroid).'],
      tests: ['Four-point salivary or dried-urine cortisol (DUTCH) to map the daily rhythm.', 'Repeat morning cortisol and DHEA-S.', 'If morning cortisol is very low, a medical assessment for adrenal insufficiency.'],
    } },
  { id: 'female_hormones', group: 'plan', name: 'Female Hormone Balance', sex: 'female', rules: SEX_HORMONES.filter(rule => rule.sex === 'female'), consider: ['estradiol', 'progesterone', 'shbg', 'LH, FSH and prolactin'],
    about: 'Your sex hormone results are outside their optimal ranges.',
    finding: 'Your sex hormone results are outside their optimal ranges. Hormone levels change through the menstrual cycle, so these results are read alongside the day of your cycle and your symptoms.',
    plan: {
      nutrition: ['Eat 25–35 g of fibre a day (vegetables, beans, oats, flaxseed) to help clear used oestrogen through the gut.', 'Include cruciferous vegetables such as cabbage, broccoli and cauliflower most days.', 'Eat protein at every meal to steady blood sugar, which steadies hormones, especially with irregular cycles.', 'Limit alcohol, which raises oestrogen.'],
      lifestyle: ['Track your cycle and symptoms for 2–3 months to share with your clinician.', 'Protect sleep and manage stress; stress lowers progesterone.', 'Strength train 2–3 times a week.'],
      supplements: ['Magnesium 200–400 mg with vitamin B6 25–50 mg daily for premenstrual symptoms.', 'Myo-inositol 2–4 g daily if cycles are irregular or testosterone is raised.', 'Vitex (chasteberry) for low progesterone, only after discussion with your clinician.', 'Omega-3 fish oil 1–2 g daily.'],
      tests: ['Repeat estradiol and progesterone about 7 days after ovulation (day 19–22 of a 28-day cycle), with LH, FSH and prolactin.', 'Pelvic ultrasound if cycles are irregular or painful.', 'Hormone metabolite testing (DUTCH) if symptoms persist.'],
    } },
  { id: 'male_hormones', group: 'plan', name: 'Low Testosterone Pattern', sex: 'male', rules: SEX_HORMONES.filter(rule => rule.sex === 'male'), consider: ['testosterone', 'free_testosterone', 'shbg', 'LH, FSH and prolactin'],
    about: 'Your results suggest testosterone is lower than optimal.',
    finding: 'Your results suggest testosterone is lower than optimal. This is linked to fatigue, low libido, low mood and loss of muscle, and is very often driven by excess weight, poor sleep and insulin resistance, all of which can be improved.',
    plan: {
      nutrition: ['Eat enough protein (about 1.2–1.6 g per kg of body weight a day) and healthy fats from eggs, fish, avocado, nuts and olive oil.', 'Include zinc-rich foods: oysters, beef, pumpkin seeds and crayfish.', 'Reduce sugar, refined starch and alcohol, all of which lower testosterone.'],
      lifestyle: ['Strength train 3 times a week with compound lifts.', 'Sleep 7–9 hours, as testosterone is made mostly in deep sleep; get checked for snoring or sleep apnoea.', 'Reduce fat around the middle, which converts testosterone to oestrogen.'],
      supplements: ['Zinc 15–30 mg daily.', 'Vitamin D3 to reach optimal levels.', 'Magnesium 200–400 mg daily.', 'Ashwagandha 600 mg daily has evidence for supporting testosterone.'],
      tests: ['Repeat early-morning (before 10am) total and free testosterone with SHBG, LH, FSH, prolactin and estradiol.', 'Full blood count and PSA before any testosterone therapy.', 'Fasting insulin and HbA1c.'],
    } },
  { id: 'fatty_liver', group: 'plan', name: 'Liver Stress & Early Fatty Liver', rules: [r('alt', 'high', 3), r('ggt', 'high', 3), r('ast', 'high', 2), r('alp', 'high', 1), r('triglycerides', 'high', 1), r('fasting_insulin', 'high', 1), r('ferritin', 'high', 1), r('bilirubin_total', 'high', 1)], consider: ['ggt'],
    about: 'Your liver markers suggest the liver is under stress.',
    finding: 'Your liver markers suggest the liver is under stress, most often from fat building up in the liver (fatty liver), which travels with insulin resistance. Caught early, it is fully reversible.',
    plan: {
      nutrition: ['Cut out sugary drinks, fruit juice and sweets; fructose is the main driver of liver fat.', 'Avoid alcohol completely for at least 3 months.', 'Eat bitter and cruciferous vegetables such as bitter leaf, cabbage, broccoli and garden egg.', 'Drink 2–3 cups of coffee or green tea a day, which is linked to less liver fat.'],
      lifestyle: ['Losing 7–10% of body weight can reverse fatty liver.', 'Exercise for 150 minutes or more a week; both cardio and strength training reduce liver fat.', 'Review all medicines, herbal remedies and painkillers with your clinician, as many are processed by the liver.'],
      supplements: ['Omega-3 fish oil 2 g daily.', 'N-acetyl cysteine (NAC) 600 mg twice daily to support glutathione.', 'Milk thistle (silymarin) 200–400 mg daily.', 'Vitamin E 400–800 IU daily, only for confirmed fatty liver and under supervision.'],
      tests: ['Liver ultrasound to look for fatty liver.', 'Hepatitis B and C screening.', 'Repeat liver enzymes in 3 months.'],
    } },
  { id: 'bile_flow', group: 'plan', name: 'Bile Flow & Gallbladder Support', rules: [r('bilirubin_conj', 'high', 3), r('ggt', 'high', 2), r('alp', 'high', 2), r('bilirubin_total', 'high', 1)], consider: ['bilirubin_conj', 'ggt'],
    about: 'Your results suggest bile may not be flowing freely.',
    finding: 'Your results suggest bile may not be flowing freely. Bile digests fats and carries cholesterol and toxins out of the body, so sluggish flow can cause bloating after fatty meals, pale stools or pain under the right ribs.',
    plan: {
      nutrition: ['Eat bitter foods before meals: bitter leaf, rocket, or lemon in warm water.', 'Have small amounts of healthy fat with each meal rather than one large fatty meal.', 'Eat 25–35 g of fibre a day to carry bile out of the body.', 'Drink plenty of water.'],
      lifestyle: ['Avoid crash dieting, which increases the risk of gallstones.', 'Report pain under the right ribs, yellow eyes or pale stools to your doctor promptly.'],
      supplements: ['Taurine 500–1,000 mg daily.', 'Phosphatidylcholine (lecithin) daily.', 'Digestive enzymes or ox bile with meals, only once gallstones have been ruled out.'],
      tests: ['Ultrasound of the liver and gallbladder.', 'Repeat liver panel including GGT and direct bilirubin.'],
    } },
  { id: 'kidney_protection', group: 'plan', name: 'Kidney Protection', rules: KIDNEY, consider: ['egfr', 'protein_creatinine'],
    about: 'Your kidney markers suggest the kidneys are under strain.',
    finding: 'Your kidney markers suggest the kidneys are filtering less efficiently than they should, or are under strain. Protecting them means controlling blood pressure and blood sugar, staying hydrated and avoiding medicines that stress them.',
    plan: {
      nutrition: ['Drink enough water to keep your urine pale yellow, unless your doctor has limited your fluids.', 'Reduce salt, stock cubes and processed foods.', 'Moderate red meat and protein shakes; favour fish, beans and vegetables.', 'Avoid herbal mixtures ("agbo") of unknown content.'],
      lifestyle: ['Keep blood pressure below 130/80, and check it at home.', 'Avoid regular use of anti-inflammatory painkillers such as ibuprofen and diclofenac.', 'If you have diabetes, keep blood sugar well controlled.'],
      supplements: ['Avoid high-dose supplements, including creatine, potassium and magnesium, until your clinician has reviewed them.', 'Omega-3 fish oil is generally safe.'],
      tests: ['Repeat creatinine and eGFR, with a urine albumin-to-creatinine ratio, in 4–12 weeks.', 'Kidney ultrasound if eGFR stays low.', 'Referral to a kidney specialist if eGFR is below 45 or protein loss persists.'],
    } },
  { id: 'iron_deficiency', group: 'plan', name: 'Iron Deficiency & Anaemia', rules: IRON_LOW, consider: ['ferritin', 'tsat'],
    about: 'Your red cell and iron markers suggest low iron stores or anaemia.',
    finding: 'Your red cell and iron markers suggest low iron stores or anaemia. This reduces the oxygen reaching your tissues, causing tiredness, breathlessness, poor concentration and hair loss.',
    plan: {
      nutrition: ['Eat iron-rich foods daily: liver, beef, goat meat, fish, ugu, waterleaf, beans and lentils.', 'Pair plant sources of iron with vitamin C (oranges, guava, peppers, tomatoes) to absorb more of it.', 'Avoid tea, coffee and calcium supplements within an hour of iron-rich meals.'],
      lifestyle: ['Find the cause: heavy periods, bleeding from the stomach or bowel, and worm infection must be ruled out.', 'Postpone blood donation until your iron has recovered.'],
      supplements: ['Iron bisglycinate 25–50 mg on alternate days with vitamin C; this is absorbed better and causes fewer side effects than daily dosing.', 'Deworming, if not done in the last 6 months.', 'Vitamin B12 and folate if those are also low.'],
      tests: ['Repeat full blood count and ferritin after 8–12 weeks of treatment.', 'Stool test for blood and parasites; endoscopy if no cause is found.', 'Haemoglobin electrophoresis if red cells are small but iron is normal.'],
    } },
  { id: 'iron_overload', group: 'plan', name: 'Raised Iron Stores', rules: [r('ferritin', 'high', 3), r('tsat', 'high', 3), r('serum_iron', 'high', 1)], consider: ['tsat', 'hs_crp'],
    about: 'Your iron stores or iron saturation are higher than optimal.',
    finding: 'Your iron stores or iron saturation are higher than optimal. Excess iron is a strong oxidant that can damage the liver, heart and pancreas; a raised ferritin can also reflect inflammation or fatty liver.',
    plan: {
      nutrition: ['Stop iron supplements and iron-fortified products unless they were prescribed.', 'Limit red meat and liver, and avoid vitamin C supplements with meals.', 'Drink tea with meals, which reduces iron absorption.', 'Avoid alcohol, which increases iron absorption and liver damage.'],
      lifestyle: ['Blood donation, if you are eligible, lowers iron stores.'],
      supplements: ['Avoid multivitamins that contain iron.'],
      tests: ['Repeat fasting ferritin, iron and transferrin saturation with hs-CRP and liver enzymes.', 'Genetic test for haemochromatosis (HFE) if transferrin saturation stays above 45%.', 'Liver ultrasound.'],
    } },
  { id: 'methylation', group: 'plan', name: 'Methylation Support (B12, Folate & Homocysteine)', rules: METHYLATION, consider: ['homocysteine', 'b12', 'folate', 'Methylmalonic acid (MMA)'],
    about: 'Your B12, folate or homocysteine results suggest methylation is not running efficiently.',
    finding: 'Your B12, folate or homocysteine results suggest methylation is not running efficiently. Methylation keeps homocysteine low and supports energy, mood, nerve health, detoxification and DNA repair.',
    plan: {
      nutrition: ['Eat leafy green vegetables daily (ugu, efo, spinach, lettuce) for folate.', 'Include B12 foods: eggs, fish, meat, liver and dairy. Plant-based diets need a B12 supplement.', 'Limit alcohol, which depletes folate.'],
      lifestyle: ['Review your medicines with your clinician: metformin and acid-reducing medicines lower B12.'],
      supplements: ['Methylcobalamin (B12) 1,000 µg daily.', 'Methylfolate 400–800 µg daily.', 'Vitamin B6 (P5P) 25–50 mg daily.', 'Trimethylglycine (TMG) 500–1,000 mg daily if homocysteine stays raised.'],
      tests: ['Repeat homocysteine, B12 and folate in 3 months.', 'Methylmalonic acid (MMA), the most sensitive test for B12 deficiency.', 'MTHFR genotyping if homocysteine stays high.'],
    } },
  { id: 'chronic_inflammation', group: 'plan', name: 'Chronic Inflammation', rules: INFLAMMATION, consider: ['hs_crp'],
    about: 'Your inflammatory markers are raised.',
    finding: 'Your inflammatory markers are raised. Inflammation that persists drives heart disease, insulin resistance, joint pain and fatigue, and usually has a source that can be found, such as diet, excess weight, gum or gut problems, or an ongoing infection.',
    plan: {
      nutrition: ['Follow an anti-inflammatory diet: vegetables, fruit, fish, beans, nuts, olive oil, ginger, turmeric and garlic.', 'Cut out ultra-processed foods, sugar, fried foods and reused oils.', 'Eat oily fish (mackerel, sardines) at least twice a week.'],
      lifestyle: ['Look for and treat sources of inflammation: gum disease, sinus or urinary infections, gut problems.', 'Sleep 7–9 hours and exercise moderately; both lower CRP.', 'Lose weight if needed: fat around the middle is an active source of inflammation.'],
      supplements: ['Omega-3 fish oil (EPA + DHA) 2 g daily.', 'Curcumin 500–1,000 mg daily, in a well-absorbed form.', 'Vitamin D3 to reach optimal levels.'],
      tests: ['Repeat hs-CRP in 4–6 weeks, at least two weeks after any infection.', 'A dental check-up.', 'Further tests guided by symptoms, such as stool tests or an autoimmune screen.'],
    } },
  { id: 'vitamin_d', group: 'plan', name: 'Vitamin D Repletion', rules: [r('vitamin_d', 'low', 3), r('pth', 'high', 1)], consider: ['vitamin_d'],
    about: 'Your vitamin D is below optimal.',
    finding: 'Your vitamin D is below optimal. Vitamin D supports bones, muscles, immunity, mood and blood sugar control, and deficiency is common even in sunny countries, especially with darker skin and indoor work.',
    plan: {
      nutrition: ['Eat oily fish (mackerel, sardines, salmon), egg yolks and liver.', 'Include magnesium-rich foods, which are needed to activate vitamin D: leafy greens, nuts, seeds and beans.'],
      lifestyle: ['Get 15–30 minutes of midday sun on your arms and legs on most days.'],
      supplements: ['Vitamin D3 2,000–5,000 IU daily with a meal containing fat, with vitamin K2 (MK-7) 100 µg.', 'Magnesium 200–400 mg daily.'],
      tests: ['Repeat 25-OH vitamin D after 3 months of supplementation, aiming for 50–80 ng/mL.', 'Calcium with the repeat test if taking more than 4,000 IU a day.'],
    } },
  { id: 'mineral_repletion', group: 'plan', name: 'Magnesium & Mineral Repletion', rules: MINERALS, consider: ['rbc_magnesium', 'zinc'],
    about: 'Your results suggest low mineral reserves.',
    finding: 'Your results suggest low mineral reserves, particularly magnesium or zinc. These minerals drive hundreds of enzymes for energy, sleep, immunity, blood sugar and hormone production.',
    plan: {
      nutrition: ['Eat magnesium-rich foods daily: pumpkin seeds, groundnuts, cashews, leafy greens, beans, avocado and dark chocolate.', 'Eat zinc-rich foods: oysters, beef, crayfish, pumpkin seeds and eggs.', 'Limit alcohol, sugar and fizzy drinks, which drain minerals.'],
      lifestyle: ['Manage stress, which increases magnesium loss.', 'Replace electrolytes after heavy sweating.'],
      supplements: ['Magnesium glycinate 200–400 mg in the evening.', 'Zinc 15–30 mg daily with food, with copper 1–2 mg if taking zinc for more than 3 months.'],
      tests: ['RBC magnesium and serum zinc in 3 months.'],
    } },
  { id: 'bone_balance', group: 'plan', name: 'Bone & Calcium Balance', rules: BONE, consider: ['vitamin_d', 'pth'],
    about: 'The balance that keeps your bones strong is under strain.',
    finding: 'Your calcium, phosphate, parathyroid hormone or vitamin D results suggest the balance that keeps your bones strong is under strain.',
    plan: {
      nutrition: ['Eat calcium-rich foods: sardines and mackerel with their bones, crayfish, leafy greens, yoghurt, sesame and beans.', 'Keep protein intake adequate for bone strength.', 'Limit fizzy drinks and excess salt.'],
      lifestyle: ['Do weight-bearing and strength exercise on most days.', 'Get regular midday sun for vitamin D.'],
      supplements: ['Vitamin D3 with K2 if vitamin D is low.', 'Magnesium 200–400 mg daily.', 'Calcium supplements only if dietary intake is low, and not if blood calcium is raised.'],
      tests: ['Repeat calcium, phosphate, PTH and vitamin D.', 'Bone density (DEXA) scan if you are over 50 or have other risk factors.', 'Prompt medical review if calcium is raised.'],
    } },
  { id: 'uric_acid', group: 'plan', name: 'Raised Uric Acid', rules: [r('uric_acid', 'high', 3)],
    about: 'Your uric acid is above optimal.',
    finding: 'Your uric acid is above optimal. High uric acid can cause gout and kidney stones, and travels with insulin resistance and high blood pressure.',
    plan: {
      nutrition: ['Cut out sugary drinks and fruit juice; fructose raises uric acid.', 'Limit organ meats, shellfish, beer and spirits.', 'Drink 2–3 litres of water a day.', 'Eat cherries, low-fat dairy and plenty of vegetables, which help lower uric acid.'],
      lifestyle: ['Lose weight gradually; crash diets raise uric acid.'],
      supplements: ['Vitamin C 500 mg daily.', 'Tart cherry extract daily.'],
      tests: ['Repeat uric acid with kidney function in 3 months.', 'Fasting insulin and HbA1c.'],
    } },
  { id: 'immune_resilience', group: 'plan', name: 'Immune Resilience', rules: IMMUNE,
    about: 'Your white cell results suggest the immune system is depleted or working hard.',
    finding: 'Your white cell results suggest your immune system is either depleted or working hard, as can follow repeated infections, chronic stress or nutrient shortfalls.',
    plan: {
      nutrition: ['Eat protein at every meal; antibodies are made from protein.', 'Eat colourful fruit and vegetables for vitamin C and other antioxidants.', 'Include zinc-rich foods: crayfish, pumpkin seeds, beef and eggs.'],
      lifestyle: ['Sleep 7–9 hours; immune function drops sharply with short sleep.', 'Manage stress, which suppresses immunity.'],
      supplements: ['Vitamin D3 to reach optimal levels.', 'Zinc 15–30 mg daily.', 'Vitamin C 500–1,000 mg daily.'],
      tests: ['Repeat full blood count with differential in 4–8 weeks.', 'Stool test for parasites if eosinophils are raised.', 'Screening for infection, guided by symptoms.'],
    } },
  { id: 'protein_digestion', group: 'plan', name: 'Protein & Digestion', rules: PROTEIN,
    about: 'Your protein markers are lower than optimal.',
    finding: 'Your protein markers are lower than optimal, suggesting low protein intake or poor digestion and absorption. Protein is needed for muscle, immunity, hormones and repair.',
    plan: {
      nutrition: ['Eat a palm-sized portion of protein at every meal: fish, eggs, chicken, beans, lentils, moi moi or Greek yoghurt.', 'Chew thoroughly and eat in a relaxed setting to support digestion.', 'Include fermented foods such as yoghurt, ogi or kefir.'],
      lifestyle: ['Report bloating, reflux or loose stools, which suggest poor digestion.'],
      supplements: ['Digestive enzymes with meals if you bloat after protein.', 'A protein powder if you struggle to get enough from food.'],
      tests: ['Repeat total protein and albumin.', 'Stool test and H. pylori test if you have digestive symptoms.'],
    } },
]

// ---------------------------------------------------------------------------
// Scoring

export type Contributor = { entry: AssessedEntry; direction: 'low' | 'high'; weight: number }

export type AreaResult = {
  area: Area
  /** Likelihood of dysfunction, 0–100. */
  score: number
  contributors: Contributor[]
  considered: AssessedEntry[]
  /** Tests that would sharpen the picture, not in these results. */
  missing: string[]
  /** A key result for this area (weight 2 or more) is past an alarm limit. */
  urgent: boolean
}

/** Markers that are the same test reported another way, so one stands in for the other. */
const SAME_TEST: Record<string, string> = { hba1c: 'hba1c_ifcc', hba1c_ifcc: 'hba1c' }

/** How strongly a result supports a rule: 1 outside the lab range, 0.8 outside optimal, 0.25 borderline. */
function strength(entry: AssessedEntry, dir: Rule['dir']): { value: number; direction: 'low' | 'high' } | null {
  const band = bandOf(entry)
  const side = isLowBand(band) ? 'low' : isHighBand(band) ? 'high' : entry.fm === 'borderline' ? lean(entry) : null
  if (!side || (dir !== 'any' && dir !== side)) return null
  if (band === 'optimal') return { value: 0.25, direction: side }
  if (band === 'below_optimal' || band === 'above_optimal') return { value: 0.8, direction: side }
  return { value: 1, direction: side }
}

function scoreArea(area: Area, byMarker: Map<string, AssessedEntry>, sex: Sex): AreaResult | null {
  // A sex-specific plan needs the patient's sex: the ranges it reads depend on it.
  if (area.sex && area.sex !== sex) return null
  const rules = area.rules.filter(rule => !rule.sex || !sex || rule.sex === sex)
  // Without the patient's sex, each sex-specific marker is judged once, by its stronger rule.
  const seen = new Set<string>()
  const considered: AssessedEntry[] = []
  const contributors: Contributor[] = []
  let healthy = 1
  for (const rule of [...rules].sort((a, b) => b.weight - a.weight)) {
    const entry = byMarker.get(rule.id)
    if (!entry || seen.has(rule.id)) continue
    seen.add(rule.id)
    considered.push(entry)
    const found = strength(entry, rule.dir)
    if (!found) continue
    healthy *= 1 - 0.9 * found.value * (rule.weight / 3)
    contributors.push({ entry, direction: found.direction, weight: rule.weight })
  }
  if (!considered.length) return null
  const wanted = Array.from(new Set([...rules.filter(rule => rule.weight >= 2).map(rule => rule.id), ...(area.consider || [])]))
  const missing = wanted.filter(id => !byMarker.has(id) && !(SAME_TEST[id] && byMarker.has(SAME_TEST[id]))).map(id => markerById(id)?.name || id)
  return {
    area,
    score: Math.round((1 - healthy) * 100),
    contributors,
    considered,
    missing: Array.from(new Set(missing)),
    urgent: contributors.some(item => item.entry.urgent && item.weight >= 2),
  }
}

export type Analysis = ReturnType<typeof analyse>

/** The whole assessment of a set of results. */
export function analyse(entries: FmEntry[], sex: Sex) {
  const all = withCalculated(entries, sex)
  const summary = summarize(all)
  const byMarker = new Map<string, AssessedEntry>()
  for (const entry of summary.assessed) if (entry.markerId && entry.numeric !== null && !byMarker.has(entry.markerId)) byMarker.set(entry.markerId, entry)
  const areas = AREAS.map(area => scoreArea(area, byMarker, sex)).filter((item): item is AreaResult => !!item)
  const group = (name: AreaGroup) => areas.filter(item => item.area.group === name).sort((a, b) => b.score - a.score)
  const bands = Object.fromEntries([...BANDS, 'unknown'].map(band => [band, 0])) as Record<Band, number>
  summary.assessed.forEach(entry => { bands[bandOf(entry)] += 1 })
  // An area with a result past an alarm limit always needs attention, and comes first.
  const plan = group('plan').filter(item => item.score >= 50 || item.urgent).sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.score - a.score)
  return { entries: all, summary, areas, group, bands, plan }
}

/** Whether an area's likelihood is high enough to get its own explanation. */
export const needsDetail = (item: AreaResult) => item.score >= 50 || item.urgent

export function likelihoodLabel(score: number) {
  if (score >= 90) return { label: 'Dysfunction highly likely', advice: 'Much improvement required.' }
  if (score >= 70) return { label: 'Dysfunction likely', advice: 'Improvement required.' }
  if (score >= 50) return { label: 'Dysfunction possible', advice: 'There may be improvement needed in certain areas.' }
  return { label: 'Dysfunction less likely', advice: 'No specific action needed.' }
}

export function priorityOf(item: AreaResult): Priority {
  if (item.urgent) return 'urgent'
  if (item.score >= 70) return 'high'
  if (item.score >= 50) return 'moderate'
  return 'low'
}

// ---------------------------------------------------------------------------
// The standard plan, before the AI or the clinician personalise it

/** The four parts of an improvement area's plan, in report order. */
export const PLAN_PARTS: Array<{ key: keyof AreaPlan; title: string; color: string }> = [
  { key: 'nutrition', title: 'Nutrition', color: '#2D6A4F' },
  { key: 'lifestyle', title: 'Lifestyle', color: '#3A7CA5' },
  { key: 'supplements', title: 'Supplements to discuss', color: '#A8742A' },
  { key: 'tests', title: 'Follow-up tests', color: '#6E5BA7' },
]

const EMPTY_PLAN: AreaPlan = { nutrition: [], lifestyle: [], supplements: [], tests: [] }

/** An area's plan as the clinician left it, or the standard plan. */
export function planFor(area: Area, narrative: Pick<FmNarrative, 'areaPlans'>): AreaPlan {
  return narrative.areaPlans?.[area.id] || area.plan || EMPTY_PLAN
}

const listNames = (names: string[]) => names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

export function defaultSummary(analysis: Analysis) {
  const { bands, summary, plan } = analysis
  const optimal = bands.optimal
  const outOptimal = bands.below_optimal + bands.above_optimal
  const outStandard = bands.below_standard + bands.above_standard + bands.alarm_low + bands.alarm_high
  const top = plan.slice(0, 3).map(item => item.area.name.toLowerCase())
  return `Of the ${summary.total} biomarkers analysed, ${optimal} are within the optimal range, ${outOptimal} are outside optimal but within the laboratory's standard range, and ${outStandard} are outside the standard range.${top.length ? ` The areas that need the most attention are ${listNames(top)}.` : ' No area shows a strong pattern of dysfunction.'}${summary.urgent.length ? ' Some results are well outside the laboratory range and should be reviewed with your doctor promptly.' : ''}`
}

export function defaultFindings(analysis: Analysis): FmNarrative['findings'] {
  const findings: FmNarrative['findings'] = analysis.summary.urgent.slice(0, 3).map(entry => {
    const direction = directionOf(entry) || 'high'
    return {
      priority: 'urgent' as Priority,
      title: `${entry.name} ${entry.value} ${entry.unit} — well ${direction === 'low' ? 'below' : 'above'} the laboratory range`.replace(/\s+/g, ' '),
      detail: `${markerExplanation(entry.markerId, direction) || `The laboratory range is ${entry.labRange}.`} Please review this result with your doctor promptly.`,
    }
  })
  for (const item of analysis.plan) {
    if (findings.length >= 6) break
    const markers = item.contributors.slice(0, 4).map(({ entry, direction }) => `${entry.name} ${direction === 'low' ? '↓' : '↑'}`).join(', ')
    findings.push({ priority: priorityOf(item), title: `${item.area.name} (${item.score}%)`, detail: `${item.area.finding || item.area.about}${markers ? ` Key markers: ${markers}.` : ''}` })
  }
  return findings
}

export function defaultRecommendations(analysis: Analysis): FmNarrative['recommendations'] {
  return analysis.plan.slice(0, 8).map(item => {
    const plan = item.area.plan || EMPTY_PLAN
    return {
      priority: priorityOf(item),
      title: item.area.name,
      items: [...plan.nutrition.slice(0, 2), ...plan.lifestyle.slice(0, 1), ...plan.supplements.slice(0, 1), ...plan.tests.slice(0, 1)],
    }
  })
}

export function defaultNextSteps(analysis: Analysis): FmNarrative['nextSteps'] {
  const urgent = analysis.summary.urgent.map(entry => `${entry.name}: ${entry.value} ${entry.unit} (laboratory range ${entry.labRange || '—'})`.replace(/\s+/g, ' '))
  const tests = Array.from(new Set(analysis.plan.flatMap(item => (item.area.plan?.tests || []).slice(0, 1)))).slice(0, 5)
  const missing = Array.from(new Set(analysis.plan.flatMap(item => item.missing))).slice(0, 6)
  return [
    {
      title: urgent.length ? 'See your doctor promptly' : 'Review this report with your clinician',
      text: urgent.length
        ? 'Some results are well outside the laboratory\'s range and need medical review soon, before starting the wider plan.'
        : 'Go through the findings and the plan together, alongside your symptoms, history and current medicines, and agree which changes to start first.',
      items: urgent.length ? urgent : ['Bring a list of your current medicines and supplements.', 'Note any symptoms you have noticed, and when they started.'],
    },
    {
      title: 'Follow-up testing',
      text: 'Retesting shows whether the plan is working. Most markers are worth repeating 8–12 weeks after starting changes.',
      items: [...tests, ...(missing.length ? [`Consider adding: ${missing.join(', ')}.`] : [])],
    },
    {
      title: 'Start with the foundations',
      text: 'The biggest gains usually come from the basics. Any supplement or medicine change should be agreed with your clinician first.',
      items: Array.from(new Set(analysis.plan.slice(0, 3).flatMap(item => (item.area.plan?.lifestyle || []).slice(0, 1)))).concat('Sleep 7–9 hours, eat whole foods, move daily and limit alcohol.').slice(0, 4),
    },
  ]
}

